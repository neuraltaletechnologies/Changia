const nodemailer = require("nodemailer");
const { env } = require("../config");

let transporter = null;

/**
 * Returns (and caches) a nodemailer transporter configured from env vars.
 * In dev mode with no SMTP config, returns a JSONTransport that logs
 * emails to the console instead of sending.
 */
function getTransporter() {
  if (transporter) return transporter;

  // config.js stores SMTP as a nested object: env.SMTP.host, env.SMTP.user, etc.
  const smtp = env.SMTP || {};
  const hasSMTP = smtp.host && smtp.user && smtp.password;

  if (hasSMTP) {
    transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port || 465,
      secure: (smtp.port || 465) === 465, // true for port 465 (SSL)
      auth: {
        user: smtp.user,
        pass: smtp.password,
      },
      tls: {
        rejectUnauthorized: false, // Allow self-signed certs in dev
      },
    });
    console.log(`📧 Nodemailer transporter created for ${smtp.host}:${smtp.port}`);
  } else {
    // Dev fallback — log emails to console
    console.warn("📧 No SMTP configured — emails will be logged to console only. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD in .env");
    transporter = {
      sendMail: async (options) => {
        console.log("📧 [DEV EMAIL] Would send:");
        console.log(`  To: ${options.to}`);
        console.log(`  Subject: ${options.subject}`);
        console.log(`  From: ${options.from}`);
        console.log(`  HTML length: ${(options.html || "").length} chars`);
        return { messageId: `dev-${Date.now()}` };
      },
    };
  }

  return transporter;
}

/**
 * Sends an email using the configured transporter.
 * @param {Object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.subject - Email subject
 * @param {string} params.html - HTML body
 * @param {string} [params.text] - Optional plain text body
 * @param {string} [params.from] - Optional sender override
 * @returns {Object} nodemailer info object
 */
async function sendEmail({ to, subject, html, text, from }) {
  const transport = getTransporter();
  const smtp = env.SMTP || {};
  const senderName = smtp.fromName || "Changia";
  const senderEmail = from || smtp.fromEmail || smtp.user;

  const info = await transport.sendMail({
    from: `"${senderName}" <${senderEmail}>`,
    to,
    subject,
    html,
    text: text || undefined,
  });

  console.log(`📧 Email sent to ${to}: ${info.messageId}`);
  return info;
}

/**
 * Generates the HTML for a campaign donation link email.
 */
function buildCampaignLinkEmail({ campaignName, campaignStory, campaignUrl, goalAmount, organizationName }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color:#10b981;padding:24px 32px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;">💚 Changia</h1>
              <p style="color:#d1fae5;margin:8px 0 0;font-size:14px;">${organizationName || "Changia"}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="color:#1f2937;margin:0 0 16px;font-size:20px;">Support: ${campaignName}</h2>

              ${campaignStory ? `<p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px;">${campaignStory.substring(0, 300)}${campaignStory.length > 300 ? "..." : ""}</p>` : ""}

              ${goalAmount ? `<p style="color:#6b7280;font-size:14px;margin:0 0 24px;">Goal: <strong style="color:#1f2937;">TZS ${Number(goalAmount).toLocaleString()}</strong></p>` : ""}

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px;">
                    <a href="${campaignUrl}"
                       style="background-color:#10b981;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:16px;font-weight:bold;display:inline-block;">
                      Donate Now →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color:#6b7280;font-size:13px;line-height:1.5;margin:0;">
                Click the button above to open the campaign page and contribute via mobile money.
                Your PIN is entered only in the secure operator prompt — Changia never sees or stores it.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;">
              <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;">
                This email was sent by <a href="https://changia.org.tz" style="color:#10b981;">Changia</a> — Tanzania's digital fundraising platform.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Generates the HTML for a donation receipt email.
 */
function buildDonationReceiptEmail({ donorName, campaignName, amount, receiptNumber, transactionId, campaignUrl }) {
  const formattedAmount = Number(amount).toLocaleString('en-TZ');
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color:#10b981;padding:24px 32px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;">💚 Changia</h1>
              <p style="color:#d1fae5;margin:8px 0 0;font-size:14px;">Donation Receipt</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="color:#1f2937;margin:0 0 8px;font-size:20px;">Thank you, ${donorName}!</h2>
              <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px;">
                Your generous contribution to <strong>${campaignName}</strong> has been received and confirmed.
              </p>

              <!-- Receipt Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin:0 0 24px;">
                <tr>
                  <td style="padding:20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:14px;">Amount</td>
                        <td style="padding:6px 0;color:#1f2937;font-size:16px;font-weight:bold;text-align:right;">TZS ${formattedAmount}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:14px;border-top:1px solid #e5e7eb;">Receipt Number</td>
                        <td style="padding:6px 0;color:#1f2937;font-size:14px;font-weight:bold;text-align:right;border-top:1px solid #e5e7eb;">${receiptNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:14px;border-top:1px solid #e5e7eb;">Transaction ID</td>
                        <td style="padding:6px 0;color:#1f2937;font-size:14px;font-weight:bold;text-align:right;border-top:1px solid #e5e7eb;">#${transactionId}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:14px;border-top:1px solid #e5e7eb;">Campaign</td>
                        <td style="padding:6px 0;color:#1f2937;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${campaignName}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:14px;border-top:1px solid #e5e7eb;">Date</td>
                        <td style="padding:6px 0;color:#1f2937;font-size:14px;text-align:right;border-top:1px solid #e5e7eb;">${new Date().toLocaleDateString('en-TZ', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 16px;">
                Please keep this receipt for your records. Your donation makes a real difference.
              </p>

              ${campaignUrl ? `
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0;">
                    <a href="${campaignUrl}"
                       style="background-color:#10b981;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:bold;display:inline-block;">
                      View Campaign →
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}

              <p style="color:#6b7280;font-size:12px;line-height:1.5;margin:16px 0 0;">
                Your PIN was entered only in the secure operator prompt — Changia never sees or stores it.
                If you have questions about this donation, please contact the campaign organizer.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;">
              <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;">
                This receipt was sent by <a href="https://changia.org.tz" style="color:#10b981;">Changia</a> — Tanzania's digital fundraising platform.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

module.exports = { sendEmail, buildCampaignLinkEmail, buildDonationReceiptEmail, getTransporter };
