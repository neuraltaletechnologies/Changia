/**
 * Messaging provider bridge (SMS / WhatsApp / Email).
 *
 * CURRENT STATE: simulated. Every send is recorded in `message_batches` and
 * `message_deliveries` with a synthetic provider reference so the reminder /
 * notification workflow works end-to-end without third-party credentials.
 *
 * To go live, implement a provider per channel guarded by environment
 * variables, for example:
 *   - SMS      → Twilio / AfricasTalking / InfoBip   (MESSAGE_SMS_API_KEY…)
 *   - WhatsApp → Meta WhatsApp Business Cloud API    (WHATSAPP_TOKEN, WHATSAPP_PHONE_ID)
 *   - Email    → SES / Mailgun / SendGrid            (EMAIL_API_KEY…)
 * The function signature stays the same; only the return object changes.
 */

const { env } = require("../config");

function makeSimulatedRef(channel) {
  return `SIM-${channel}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

/**
 * @param {{channel: 'SMS'|'WHATSAPP'|'EMAIL'|'PHONE', to: string, subject?: string, body: string}} input
 * @returns {Promise<{provider: string, providerRef: string|null, simulated: boolean, status: string}>}
 */
async function sendMessage({ channel, to, subject, body }) {
  const provider = env.MESSAGE_PROVIDER || "simulated";

  if (provider !== "simulated") {
    // Wire real gateway calls here when credentials are configured.
    console.info(`[messaging] ${channel} to ${to} (${provider}) queued — provider not yet wired`);
    return {
      provider,
      providerRef: `QUEUED-${Date.now()}`,
      simulated: true,
      status: "SENT",
    };
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

module.exports = { sendMessage, recipientFor };