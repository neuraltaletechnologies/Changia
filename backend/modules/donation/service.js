const { randomUUID } = require("crypto");
const db = require("../../db");
const { ApiError } = require("../../utils/ApiError");
const { normalizePhone } = require("../../utils/phone");
const poolService = require("../donor-pool/service");
const clickPesa = require("../../utils/clickPesa");

const MIN_PUSH_AMOUNT = 1000;

function nextReceiptNumber(year) {
  const seq = Math.floor(100 + Math.random() * 899900);
  return `CHG-${year}-${String(seq).padStart(6, "0")}`;
}

function num(value) {
  return value === null || value === undefined ? 0 : Number(value);
}

/**
 * Records a confirmed donation. Called after payment success — in production
 * this happens inside the verified gateway callback handler. The unique
 * payment_attempt_id constraint + the pre-check ensure a gateway event is
 * never counted twice.
 */
async function recordConfirmedDonation(data) {
  if (data.amount <= 0) {
    throw ApiError.badRequest("Donation amount must be greater than zero");
  }

  if (data.paymentAttemptId) {
    const existing = await db.query(
      "SELECT id FROM donations WHERE payment_attempt_id = ?",
      [data.paymentAttemptId]
    );
    if (existing.length > 0) {
      throw ApiError.conflict("A donation for this attempt already exists", "ALREADY_PROCESSED");
    }
  }

  const campaigns = await db.query(
    "SELECT * FROM campaigns WHERE id = ? AND organization_id = ?",
    [data.campaignId, data.organizationId]
  );
  const campaign = campaigns[0];
  if (!campaign) throw ApiError.notFound("Campaign not found");
  if (campaign.status !== "ACTIVE") {
    throw ApiError.badRequest("This campaign is not accepting donations", "CAMPAIGN_NOT_ACTIVE");
  }
  if (num(campaign.raised_amount) >= num(campaign.public_target)) {
    throw ApiError.badRequest("This campaign has reached its target", "CAMPAIGN_FULL");
  }

  // Look up the donor by phone if not provided.
  // Unmatched payments (unknown or anonymous senders) are parked in the
  // organization's anomalous pool so they can be re-attached to a known donor.
  let donorId = data.donorId;
  let anomalousDonorCreated = false;
  let campaignDonorTargetId = data.campaignDonorTargetId || null;

  if (!donorId && data.donorPhone) {
    const phone = normalizePhone(data.donorPhone);
    const existingDonor = await db.query(
      "SELECT id FROM donors WHERE organization_id = ? AND phone = ?",
      [data.organizationId, phone]
    );
    if (existingDonor.length > 0) {
      donorId = existingDonor[0].id;
    } else {
      const created = await db.execute(
        `INSERT INTO donors
           (organization_id, phone, first_name, last_name, status, consent_status, preferred_channel, is_anomalous)
         VALUES (?, ?, ?, ?, 'ACTIVE', 'PENDING', 'SMS', 1)`,
        [
          data.organizationId,
          phone,
          data.donorName && !data.isAnonymous ? data.donorName : "Unknown",
          data.isAnonymous ? null : null,
        ]
      );
      donorId = created.insertId;
      anomalousDonorCreated = true;
    }
  } else if (!donorId) {
    // Anonymous / no phone: create an anomalous bucket donor.
    const created = await db.execute(
      `INSERT INTO donors
         (organization_id, first_name, status, consent_status, preferred_channel, is_anomalous)
       VALUES (?, 'Anonymous', 'ACTIVE', 'PENDING', 'SMS', 1)`,
      [data.organizationId]
    );
    donorId = created.insertId;
    anomalousDonorCreated = true;
  }

  if (anomalousDonorCreated) {
    // Attribute the unmatched payment to the campaign's assigned manager (the
    // earliest-assigned one, if several) so it lands in *their* anomalous
    // pool rather than a shared org-wide bucket. Falls back to the org-wide
    // "Unassigned" pool when the campaign has no assigned manager.
    const assignments = await db.query(
      `SELECT user_id FROM campaign_assignments WHERE campaign_id = ? ORDER BY assigned_at ASC LIMIT 1`,
      [data.campaignId]
    );
    const managerId = assignments[0]?.user_id || null;
    await poolService.ensureAnomalousPoolMember(data.organizationId, donorId, managerId);
  }

  const receiptNumber = nextReceiptNumber(new Date().getFullYear());

  // Everything in one transaction: donation + campaign totals update
  // Look up campaign name + donor email for the receipt
  const campaignInfo = await db.query(
    "SELECT name, slug FROM campaigns WHERE id = ?",
    [data.campaignId]
  );
  const campaignName = campaignInfo[0]?.name || '';
  const campaignSlug = campaignInfo[0]?.slug || '';

  // Resolve donor email: from data → from payment_attempt → from donor record
  let donorEmail = data.donorEmail || null;
  if (!donorEmail && data.paymentAttemptId) {
    const paRows = await db.query("SELECT donor_email FROM payment_attempts WHERE id = ?", [data.paymentAttemptId]);
    donorEmail = paRows[0]?.donor_email || null;
  }
  if (!donorEmail && donorId) {
    const donorRows = await db.query("SELECT email FROM donors WHERE id = ?", [donorId]);
    donorEmail = donorRows[0]?.email || null;
  }

  return db.withTransaction(async (tx) => {
    const created = await tx.execute(
      `INSERT INTO donations
         (organization_id, campaign_id, donor_id, payment_attempt_id, amount, method,
          status, donor_name, donor_phone, donor_email, is_anonymous, receipt_number, gateway_ref, confirmed_at)
       VALUES (?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        data.organizationId,
        data.campaignId,
        donorId || null,
        data.paymentAttemptId || null,
        data.amount,
        data.method,
        data.isAnonymous ? null : (data.donorName || null),
        data.donorPhone || null,
        data.donorEmail || null,
        data.isAnonymous ? 1 : 0,
        receiptNumber,
        data.gatewayRef || null,
      ]
    );

    await tx.execute(
      `UPDATE campaigns SET raised_amount = raised_amount + ?, donor_count = donor_count + 1
       WHERE id = ?`,
      [data.amount, data.campaignId]
    );

    await tx.execute(
      `INSERT INTO audit_logs (organization_id, actor_email, action, resource, resource_id, severity)
       VALUES (?, ?, 'donation.confirmed', 'donation', ?, 'INFO')`,
      [data.organizationId, data.donorName || "anonymous donor", String(created.insertId)]
    );

    return {
      id: created.insertId,
      organizationId: data.organizationId,
      campaignId: data.campaignId,
      donorId: donorId || null,
      paymentAttemptId: data.paymentAttemptId || null,
      amount: data.amount,
      method: data.method,
      status: "CONFIRMED",
      donorName: data.isAnonymous ? null : (data.donorName || null),
      donorPhone: data.donorPhone || null,
      isAnonymous: data.isAnonymous || false,
      receiptNumber,
      gatewayRef: data.gatewayRef || null,
      confirmedAt: new Date(),
    };
  }).then(async (donation) => {
    // ─── Update Campaign Donor Target Status ──────────────────────────────
    // If this donor was in the campaign's targeted list, update their
    // payment status so the dashboard shows who has/hasn't paid.
    if (donation.donorId && data.campaignId) {
      // If campaignDonorTargetId wasn't passed, try to find it now
      if (!campaignDonorTargetId) {
        const cdtRows = await db.query(
          "SELECT id FROM campaign_donor_targets WHERE campaign_id = ? AND donor_id = ? LIMIT 1",
          [data.campaignId, donation.donorId]
        );
        if (cdtRows.length > 0) {
          campaignDonorTargetId = cdtRows[0].id;
        }
      }

      if (campaignDonorTargetId) {
        // Calculate total paid by this donor for this campaign
        const paidResult = await db.query(
          `SELECT COALESCE(SUM(amount), 0) AS total_paid
           FROM donations
           WHERE campaign_id = ? AND donor_id = ? AND status = 'CONFIRMED'`,
          [data.campaignId, donation.donorId]
        );
        const totalPaid = num(paidResult[0]?.total_paid);

        // Get the expected amount
        const cdtRow = await db.query(
          "SELECT expected_amount FROM campaign_donor_targets WHERE id = ?",
          [campaignDonorTargetId]
        );
        const expectedAmount = num(cdtRow[0]?.expected_amount);

        // Determine payment status
        let paymentStatus = "UNPAID";
        if (expectedAmount > 0 && totalPaid >= expectedAmount) {
          paymentStatus = "PAID_FULL";
        } else if (totalPaid > 0) {
          paymentStatus = "PARTIAL";
        }

        await db.execute(
          `UPDATE campaign_donor_targets
           SET actual_amount = ?, payment_status = ?
           WHERE id = ?`,
          [totalPaid, paymentStatus, campaignDonorTargetId]
        );
      }
    }

    return donation;
  }).then(async (donation) => {
    // ─── Send Receipt Email ──────────────────────────────────────────────
    // Fire-and-forget: send a receipt email with transaction ID if email available
    if (donorEmail && !data.isAnonymous) {
      try {
        const { sendEmail, buildDonationReceiptEmail } = require('../../utils/email');
        const html = buildDonationReceiptEmail({
          donorName: data.donorName || 'Donor',
          campaignName,
          amount: data.amount,
          receiptNumber,
          transactionId: String(donation.id),
          campaignUrl: campaignSlug ? `https://changia.org.tz/campaigns/${campaignSlug}` : null,
        });
        await sendEmail({
          to: donorEmail,
          subject: `Thank you for your donation of TZS ${Number(data.amount).toLocaleString()} — Receipt ${receiptNumber}`,
          html,
        });
        console.log(`[donation] Receipt email sent to ${donorEmail} for donation #${donation.id}`);
      } catch (err) {
        console.error(`[donation] Failed to send receipt email:`, err.message);
      }
    }
    return donation;
  });
}

/**
 * Creates a PaymentAttempt (push donation). No money moves here — the donor
 * still needs to confirm with their PIN at the gateway prompt.
 */
async function createPaymentAttempt(data) {
  if (data.amount < MIN_PUSH_AMOUNT) {
    throw ApiError.badRequest(
      `Minimum donation is TZS ${MIN_PUSH_AMOUNT.toLocaleString()}`,
      "BELOW_MINIMUM"
    );
  }

  const campaigns = await db.query(
    "SELECT * FROM campaigns WHERE id = ? AND organization_id = ?",
    [data.campaignId, data.organizationId]
  );
  const campaign = campaigns[0];
  if (!campaign) throw ApiError.notFound("Campaign not found");
  if (campaign.status !== "ACTIVE") {
    throw ApiError.badRequest("This campaign is not accepting donations", "CAMPAIGN_NOT_ACTIVE");
  }

  const raised = num(campaign.raised_amount);
  if (raised >= num(campaign.public_target)) {
    throw ApiError.badRequest("This campaign has reached its target", "CAMPAIGN_FULL");
  }
  if (data.amount > num(campaign.public_target) - raised) {
    throw ApiError.badRequest("Amount exceeds the remaining campaign target", "EXCEEDS_REMAINING");
  }

  // Rate limit: no duplicate push request to the same phone within 5 minutes
  if (data.donorPhone) {
    const phone = normalizePhone(data.donorPhone);
    const recent = await db.query(
      `SELECT id FROM payment_attempts
       WHERE donor_phone = ? AND campaign_id = ? AND status = 'PENDING'
         AND created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
       LIMIT 1`,
      [phone, data.campaignId]
    );
    if (recent.length > 0) {
      throw ApiError.conflict(
        "A payment request was already sent to this number recently. Please wait a few minutes.",
        "RATE_LIMITED"
      );
    }
  }

  let donorId = data.donorId;
  let campaignDonorTargetId = null;

  if (!donorId && data.donorPhone) {
    const phone = normalizePhone(data.donorPhone);
    const found = await db.query(
      "SELECT id FROM donors WHERE organization_id = ? AND phone = ?",
      [data.organizationId, phone]
    );
    donorId = found.length > 0 ? found[0].id : null;
  }

  // ─── Campaign Donor Target Matching ────────────────────────────────────
  // If we found a donor, check if they're a targeted donor for this
  // specific campaign (from the donor pool). This links the payment
  // to the expected amount so we can track who has/hasn't paid.
  if (donorId && data.campaignId) {
    const cdtRows = await db.query(
      "SELECT id FROM campaign_donor_targets WHERE campaign_id = ? AND donor_id = ? LIMIT 1",
      [data.campaignId, donorId]
    );
    if (cdtRows.length > 0) {
      campaignDonorTargetId = cdtRows[0].id;
    }
  }

  const expiresInMinutes = data.expiresInMinutes ?? 15;
  // Generate a ClickPesa-compatible order reference for idempotency
  const clickPesaOrderRef = clickPesa.generateOrderReference();

  const result = await db.execute(
    `INSERT INTO payment_attempts
       (campaign_id, donor_id, organization_id, initiated_by_id, method, amount,
        status, idempotency_key, donor_phone, donor_name, donor_email, campaign_donor_target_id, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
    [
      data.campaignId,
      donorId || null,
      data.organizationId,
      data.initiatedById,
      data.method,
      data.amount,
      clickPesaOrderRef,
      data.donorPhone ? normalizePhone(data.donorPhone) : null,
      data.donorName || null,
      data.donorEmail || null,
      campaignDonorTargetId,
      expiresInMinutes,
    ]
  );

  let attempts = await db.query("SELECT * FROM payment_attempts WHERE id = ?", [
    result.insertId,
  ]);
  let attempt = { ...attempts[0], amount: num(attempts[0].amount) };

  // ─── ClickPesa USSD Push ──────────────────────────────────────────────
  // If ClickPesa is enabled and we have a phone number, initiate the
  // actual USSD push so the donor gets a prompt on their phone.
  console.log(`[donation] ClickPesa enabled=${clickPesa.CLICKPESA.enabled}, donorPhone=${data.donorPhone}, campaignId=${data.campaignId}`);
  if (clickPesa.CLICKPESA.enabled && data.donorPhone) {
    console.log(`[donation] Sending ClickPesa USSD push: amount=${data.amount}, phone=${data.donorPhone}, ref=${clickPesaOrderRef}`);
    try {
      const cpResponse = await clickPesa.initiateUssdPush({
        amount: data.amount,
        phoneNumber: data.donorPhone,
        orderReference: clickPesaOrderRef,
      });
      console.log(`[donation] ClickPesa response: status=${cpResponse.status}, data=`, JSON.stringify(cpResponse.data).substring(0, 200));

      if (cpResponse.status >= 200 && cpResponse.status < 300 && cpResponse.data?.id) {
        // ClickPesa accepted the request — store the provider reference
        await db.execute(
          "UPDATE payment_attempts SET gateway_ref = ?, provider = 'clickpesa' WHERE id = ?",
          [cpResponse.data.id, result.insertId]
        );
        attempt.gateway_ref = cpResponse.data.id;
        attempt.provider = "clickpesa";
        console.log(`[donation] ✅ ClickPesa push sent successfully: id=${cpResponse.data.id}`);
      } else {
        // ClickPesa rejected — mark the attempt as failed with the error
        const errMsg = cpResponse.data?.message || `ClickPesa error: ${cpResponse.status}`;
        console.error(`[donation] ❌ ClickPesa rejected: ${errMsg}`);
        await db.execute(
          "UPDATE payment_attempts SET status = 'FAILED', error = ? WHERE id = ?",
          [errMsg, result.insertId]
        );
        attempt.status = "FAILED";
        attempt.error = errMsg;
      }
    } catch (err) {
      // Network/timeout error — keep attempt as PENDING; the donor can
      // poll for status or a webhook may still arrive.
      console.error("ClickPesa USSD push failed:", err.message);
      attempt.clickPesaError = err.message;
    }
  }

  return attempt;
}

// ─── Public (unauthenticated) self-serve contribution flow ──────────────────
// A visitor on the public campaign page initiates their own contribution
// (no admin "push" involved). No PIN is ever collected here — the donor
// approves the request at their mobile-money operator's own prompt.

/**
 * Starts a public contribution: creates a PENDING payment_attempts row
 * against a public, active campaign. Reuses createPaymentAttempt's amount /
 * remaining-target / rate-limit checks once the campaign's organization is
 * resolved from the (public) campaign id or slug.
 */
async function createPublicContribution(campaignIdOrSlug, data) {
  const isNumeric = /^\d+$/.test(String(campaignIdOrSlug));
  const campaigns = await db.query(
    `SELECT id, organization_id FROM campaigns
     WHERE is_public = 1 AND status = 'ACTIVE' AND (slug = ? ${isNumeric ? "OR id = ?" : ""}) LIMIT 1`,
    isNumeric ? [campaignIdOrSlug, campaignIdOrSlug] : [campaignIdOrSlug]
  );
  const campaign = campaigns[0];
  if (!campaign) throw ApiError.notFound("Campaign not found");

  const attempt = await createPaymentAttempt({
    organizationId: campaign.organization_id,
    campaignId: campaign.id,
    initiatedById: null,
    donorPhone: data.donorPhone,
    donorName: data.isAnonymous ? undefined : data.donorName,
    donorEmail: data.donorEmail || undefined,
    amount: data.amount,
    method: "LINK",
  });

  return {
    attemptId: attempt.id,
    status: attempt.status,
    amount: num(attempt.amount),
    expiresAt: attempt.expires_at,
  };
}

/** Poll-friendly status for a public contribution attempt. */
async function getPublicAttemptStatus(attemptId) {
  const rows = await db.query(
    `SELECT pa.id, pa.status, pa.amount, pa.campaign_id, d.receipt_number
     FROM payment_attempts pa
     JOIN campaigns c ON c.id = pa.campaign_id
     LEFT JOIN donations d ON d.payment_attempt_id = pa.id
     WHERE pa.id = ? AND c.is_public = 1 AND pa.method = 'LINK' AND pa.initiated_by_id IS NULL`,
    [attemptId]
  );
  const attempt = rows[0];
  if (!attempt) throw ApiError.notFound("Contribution not found");
  return {
    attemptId: attempt.id,
    status: attempt.status,
    amount: num(attempt.amount),
    campaignId: attempt.campaign_id,
    receiptNumber: attempt.receipt_number || null,
  };
}

/**
 * ⚠️ Development-only stand-in for the payment gateway's verified callback.
 * Only resolves attempts that were self-initiated by a public visitor (LINK
 * method, no initiated_by_id) — an admin-pushed PUSH request can never be
 * confirmed through this public endpoint.
 */
async function simulatePublicConfirm(attemptId) {
  const rows = await db.query(
    `SELECT id FROM payment_attempts WHERE id = ? AND method = 'LINK' AND initiated_by_id IS NULL`,
    [attemptId]
  );
  if (rows.length === 0) throw ApiError.notFound("Contribution not found");

  const outcome = await resolvePaymentAttempt(attemptId, {
    status: "SUCCESS",
    gatewayRef: `SIM-${Date.now()}`,
  });
  return {
    attemptId: outcome.attempt.id,
    status: outcome.attempt.status,
    receiptNumber: outcome.donation?.receiptNumber || null,
    amount: outcome.donation?.amount ?? null,
  };
}

async function recordManualDonation(organizationId, data) {
  let donorName = data.donorName || null;
  if (data.donorId) {
    const donors = await db.query(
      "SELECT first_name, last_name FROM donors WHERE id = ? AND organization_id = ?",
      [data.donorId, organizationId]
    );
    if (donors.length === 0) throw ApiError.notFound("Donor not found");
    donorName = donorName || [donors[0].first_name, donors[0].last_name].filter(Boolean).join(" ") || null;
  }

  return recordConfirmedDonation({
    organizationId,
    campaignId: data.campaignId,
    donorId: data.donorId,
    amount: data.amount,
    method: "LINK",
    donorName,
    isAnonymous: data.isAnonymous || false,
  });
}

async function listPaymentAttempts(organizationId, campaignId) {
  const attempts = await db.query(
    `SELECT pa.*, d.receipt_number AS donation_receipt, d.status AS donation_status
     FROM payment_attempts pa
     LEFT JOIN donations d ON d.payment_attempt_id = pa.id
     WHERE pa.organization_id = ? AND pa.campaign_id = ?
     ORDER BY pa.created_at DESC LIMIT 100`,
    [organizationId, campaignId]
  );
  return attempts.map((a) => ({ ...a, amount: num(a.amount) }));
}

/**
 * Updates a pending attempt from a (simulated) gateway callback. Only a
 * successful status creates the confirmed donation — exactly once.
 */
async function resolvePaymentAttempt(attemptId, result) {
  const attempts = await db.query("SELECT * FROM payment_attempts WHERE id = ?", [
    attemptId,
  ]);
  const attempt = attempts[0];
  if (!attempt) throw ApiError.notFound("Payment attempt not found");
  if (attempt.status !== "PENDING") {
    throw ApiError.conflict("This payment request was already resolved", "ALREADY_RESOLVED");
  }

  if (result.status === "SUCCESS") {
    const donation = await recordConfirmedDonation({
      organizationId: attempt.organization_id,
      campaignId: attempt.campaign_id,
      donorId: attempt.donor_id || undefined,
      donorPhone: attempt.donor_phone || undefined,
      donorName: attempt.donor_name || undefined,
      amount: num(attempt.amount),
      method: attempt.method,
      gatewayRef: result.gatewayRef,
      paymentAttemptId: attempt.id,
      campaignDonorTargetId: attempt.campaign_donor_target_id || undefined,
    });

    await db.execute(
      "UPDATE payment_attempts SET status = 'SUCCESS', gateway_ref = ? WHERE id = ?",
      [result.gatewayRef || null, attemptId]
    );

    return { attempt: { ...attempt, status: "SUCCESS" }, donation };
  }

  await db.execute(
    "UPDATE payment_attempts SET status = ?, gateway_ref = ? WHERE id = ?",
    [result.status, result.gatewayRef || null, attemptId]
  );

  return { attempt: { ...attempt, status: result.status }, donation: null };
}

async function listDonations(organizationId, filters, user) {
  const where = ["d.organization_id = ?"];
  const values = [organizationId];

  if (user && user.role === "CAMPAIGN_MANAGER") {
    where.push("d.campaign_id IN (SELECT campaign_id FROM campaign_assignments WHERE user_id = ?)");
    values.push(user.id);
  }

  if (filters.campaignId) {
    where.push("d.campaign_id = ?");
    values.push(filters.campaignId);
  }
  if (filters.donorId) {
    where.push("d.donor_id = ?");
    values.push(filters.donorId);
  }
  if (filters.status) {
    where.push("d.status = ?");
    values.push(filters.status);
  }

  const whereSql = where.join(" AND ");
  const page = filters.page || 1;
  const limit = filters.limit || 25;
  const offset = (page - 1) * limit;

  const donations = await db.query(
    `SELECT d.*, c.name AS campaign_name, c.slug AS campaign_slug
     FROM donations d
     JOIN campaigns c ON c.id = d.campaign_id
     WHERE ${whereSql}
     ORDER BY d.created_at DESC LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  const [[countRow]] = await db
    .query(`SELECT COUNT(*) AS total FROM donations d WHERE ${whereSql}`, values)
    .then((rows) => [rows]);

  return {
    donations: donations.map((d) => ({
      ...d,
      amount: num(d.amount),
      campaign: { id: d.campaign_id, name: d.campaign_name, slug: d.campaign_slug },
      isAnonymous: Boolean(d.is_anonymous),
    })),
    pagination: {
      page,
      limit,
      total: countRow.total,
      totalPages: Math.ceil(countRow.total / limit),
    },
  };
}

module.exports = {
  recordConfirmedDonation,
  recordManualDonation,
  createPaymentAttempt,
  listPaymentAttempts,
  resolvePaymentAttempt,
  listDonations,
  createPublicContribution,
  getPublicAttemptStatus,
  simulatePublicConfirm,
};
