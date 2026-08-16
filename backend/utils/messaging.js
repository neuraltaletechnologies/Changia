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

async function sendEmailLive({ to, subject, body }) {
  const transporter = getMailTransporter();
  const info = await transporter.sendMail({
    from: `"${env.SMTP.fromName}" <${env.SMTP.fromEmail}>`,
    to,
    subject: subject || "Changia",
    text: body,
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
 * @param {{channel: 'SMS'|'WHATSAPP'|'EMAIL'|'PHONE', to: string, subject?: string, body: string}} input
 * @returns {Promise<{provider: string, providerRef: string|null, simulated: boolean, status: string, error?: string}>}
 */
async function sendMessage({ channel, to, subject, body }) {
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
        return await sendEmailLive({ to, subject, body });
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

module.exports = { sendMessage, recipientFor, renderTemplate };
