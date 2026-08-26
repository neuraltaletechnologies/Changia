/**
 * Messaging provider bridge (SMS / WhatsApp / Email).
 *
 * DEFAULT STATE (MESSAGE_PROVIDER=simulated): every send is recorded in
 * `message_batches` / `message_deliveries` with a synthetic provider
 * reference so the reminder workflow works end-to-end with zero third-party
 * credentials — this is what local dev and testing use out of the box.
 *
 * LIVE STATE (MESSAGE_PROVIDER=live): real sends are attempted per channel —
 *   - SMS      → Africa's Talking          (AT_USERNAME, AT_API_KEY, AT_SENDER_ID)
 *   - WhatsApp → Meta WhatsApp Business Cloud API (WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID)
 *   - Email    → SMTP via Nodemailer       (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL)
 * If a channel's credentials are missing even in "live" mode, the send fails
 * loudly (status FAILED + error message) instead of pretending to succeed —
 * see Backend/README.md → "Messaging providers setup" for how to obtain and
 * set each credential.
 */

const { env } = require("../config");

function makeSimulatedRef(channel) {
  return `SIM-${channel}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function isEmailConfigured() {
  return Boolean(env.SMTP.host && env.SMTP.user && env.SMTP.password && env.SMTP.fromEmail);
}

function isSmsConfigured() {
  return Boolean(env.AFRICAS_TALKING.username && env.AFRICAS_TALKING.apiKey);
}

function isWhatsAppConfigured() {
  return Boolean(env.WHATSAPP.token && env.WHATSAPP.phoneNumberId);
}

let cachedTransporter = null;
function getMailTransporter() {
  if (cachedTransporter) return cachedTransporter;
  // Lazy require: nodemailer is only needed once an email is actually sent.
  const nodemailer = require("nodemailer");
  cachedTransporter = nodemailer.createTransport({
    host: env.SMTP.host,
    port: env.SMTP.port,
    secure: env.SMTP.port === 465,
    auth: { user: env.SMTP.user, pass: env.SMTP.password },
  });
  return cachedTransporter;
}

let cachedAtSms = null;
function getAfricasTalkingSms() {
  if (cachedAtSms) return cachedAtSms;
  // Lazy require: africastalking is only needed once an SMS is actually sent.
  const AfricasTalking = require("africastalking");
  const client = AfricasTalking({
    username: env.AFRICAS_TALKING.username,
    apiKey: env.AFRICAS_TALKING.apiKey,
  });
  cachedAtSms = client.SMS;
  return cachedAtSms;
}

async function sendEmailLive({ to, subject, body, html }) {
  const transporter = getMailTransporter();
  const info = await transporter.sendMail({
    from: `"${env.SMTP.fromName || "Changia"}" <${env.SMTP.fromEmail || env.SMTP.user}>`,
    to,
    subject: subject || "Changia",
    text: body,
    html: html || undefined,
  });
  return {
    provider: "smtp",
    providerRef: info.messageId || null,
    simulated: false,
    status: "SENT",
  };
}

async function sendSmsLive({ to, body }) {
  const sms = getAfricasTalkingSms();
  const result = await sms.send({
    to: [to],
    message: body,
    from: env.AFRICAS_TALKING.senderId || undefined,
  });
  const recipient = result?.SMSMessageData?.Recipients?.[0];
  if (recipient && recipient.status && recipient.status !== "Success") {
    throw new Error(recipient.status);
  }
  return {
    provider: "africastalking",
    providerRef: recipient?.messageId || null,
    simulated: false,
    status: "SENT",
  };
}

async function sendWhatsAppLive({ to, body }) {
  const url = `https://graph.facebook.com/v20.0/${env.WHATSAPP.phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.WHATSAPP.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `WhatsApp API responded ${res.status}`);
  }
  return {
    provider: "whatsapp_cloud_api",
    providerRef: data?.messages?.[0]?.id || null,
    simulated: false,
    status: "SENT",
  };
}

function notConfigured(channel) {
  const message = `${channel} is not configured — set the required env vars and MESSAGE_PROVIDER=live (see Backend/README.md)`;
  console.warn(`[messaging] ${message}`);
  return {
    provider: channel.toLowerCase(),
    providerRef: null,
    simulated: false,
    status: "FAILED",
    error: message,
  };
}

/**
 * @param {{channel: 'SMS'|'WHATSAPP'|'EMAIL'|'PHONE', to: string, subject?: string, body: string, html?: string}} input
 * @returns {Promise<{provider: string, providerRef: string|null, simulated: boolean, status: string, error?: string}>}
 */
async function sendMessage({ channel, to, subject, body, html }) {
  if (!to) {
    return {
      provider: "none",
      providerRef: null,
      simulated: false,
      status: "FAILED",
      error: "Donor has no contact for this channel",
    };
  }

  const provider = env.MESSAGE_PROVIDER || "simulated";

  if (provider === "live") {
    try {
      if (channel === "EMAIL") {
        if (!isEmailConfigured()) return notConfigured("EMAIL");
        return await sendEmailLive({ to, subject, body, html });
      }
      if (channel === "SMS") {
        if (!isSmsConfigured()) return notConfigured("SMS");
        return await sendSmsLive({ to, body });
      }
      if (channel === "WHATSAPP") {
        if (!isWhatsAppConfigured()) return notConfigured("WHATSAPP");
        return await sendWhatsAppLive({ to, body });
      }
      return notConfigured(channel);
    } catch (error) {
      console.error(`[messaging] ${channel} send to ${to} failed:`, error.message);
      return {
        provider: channel.toLowerCase(),
        providerRef: null,
        simulated: false,
        status: "FAILED",
        error: error.message,
      };
    }
  }

  console.info(`[messaging] [simulated] ${channel} ${subject ? `"${subject}" - ` : ""}${to}`);
  return {
    provider: "simulated",
    providerRef: makeSimulatedRef(channel),
    simulated: true,
    status: "DELIVERED",
  };
}

/**
 * Recipient address for a channel (email for EMAIL, otherwise phone).
 */
function recipientFor(channel, donor) {
  if (channel === "EMAIL") return donor.email;
  return donor.phone;
}

/**
 * Renders {{donorName}}, {{amountDue}}, {{campaignName}}, {{orgName}}
 * placeholders in a template body/subject against real values.
 */
function renderTemplate(text, vars) {
  if (!text) return text;
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) =>
    vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : match
  );
}

/**
 * Builds an HTML email for campaign reminder/donation link notifications.
 * Used by the reminder schedule system when EMAIL channel is enabled.
 */
function buildReminderEmailHtml({ donorName, campaignName, campaignUrl, orgName, messageBody }) {
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
              <p style="color:#d1fae5;margin:8px 0 0;font-size:14px;">${orgName || "Changia"}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="color:#1f2937;margin:0 0 16px;font-size:20px;">Hello ${donorName || "Donor"},</h2>

              ${messageBody ? `<p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 16px;">${messageBody}</p>` : ""}

              ${campaignName ? `<p style="color:#6b7280;font-size:14px;margin:0 0 8px;">Campaign: <strong style="color:#1f2937;">${campaignName}</strong></p>` : ""}

              <!-- CTA Button -->
              ${campaignUrl ? `
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:16px 0;">
                    <a href="${campaignUrl}"
                       style="background-color:#10b981;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:16px;font-weight:bold;display:inline-block;">
                      Donate Now →
                    </a>
                  </td>
                </tr>
              </table>
              ` : ""}

              <p style="color:#6b7280;font-size:13px;line-height:1.5;margin:16px 0 0;">
                Your contribution makes a difference. Click the button above to open the campaign page and contribute via mobile money.
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

module.exports = { sendMessage, recipientFor, renderTemplate, buildReminderEmailHtml };
