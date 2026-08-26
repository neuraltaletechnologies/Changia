const crypto = require("crypto");
const { env } = require("../config");

// ─── Configuration ──────────────────────────────────────────────────────────
const CLICKPESA = {
  get enabled() {
    return env.CLICKPESA_ENABLED === true || env.CLICKPESA_ENABLED === "true";
  },
  baseUrl: env.CLICKPESA_BASE_URL || "https://api.clickpesa.com/third-parties",
  clientId: env.CLICKPESA_CLIENT_ID || "",
  apiKey: env.CLICKPESA_API_KEY || "",
  useChecksum: env.CLICKPESA_USE_CHECKSUM === true || env.CLICKPESA_USE_CHECKSUM === "true",
  checksumSecret: env.CLICKPESA_CHECKSUM_SECRET || "",
  timeoutMs: Number(env.CLICKPESA_TIMEOUT_MS) || 15000,
};

// ─── Token cache ────────────────────────────────────────────────────────────
let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Returns a valid JWT for subsequent ClickPesa API calls.
 * Caches for ~55 minutes. Retries once on 401.
 */
async function getToken(retryOn401 = true) {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt) return cachedToken;

  const res = await fetch(`${CLICKPESA.baseUrl}/generate-token`, {
    method: "POST",
    headers: {
      "api-key": CLICKPESA.apiKey,
      "client-id": CLICKPESA.clientId,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(CLICKPESA.timeoutMs),
  });

  if (res.status === 401 && retryOn401) {
    cachedToken = null;
    tokenExpiresAt = 0;
    return getToken(false);
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.token) {
    throw new Error(
      `ClickPesa token generation failed: ${res.status} ${body.message || JSON.stringify(body)}`
    );
  }

  cachedToken = body.token;
  // Expire 5 minutes early to avoid edge cases
  tokenExpiresAt = now + 55 * 60 * 1000;
  return cachedToken;
}

// ─── Checksum ───────────────────────────────────────────────────────────────

/** Recursively sort keys, stringify compact, produce HMAC-SHA256 hex. */
function createChecksum(payload) {
  const sorted = sortObjectKeys(payload);
  const canonical = JSON.stringify(sorted);
  return crypto
    .createHmac("sha256", CLICKPESA.checksumSecret)
    .update(canonical)
    .digest("hex");
}

/** Sort all nested object keys alphabetically. */
function sortObjectKeys(obj) {
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  if (obj !== null && typeof obj === "object" && !Array.isArray(obj)) {
    return Object.keys(obj)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortObjectKeys(obj[key]);
        return acc;
      }, {});
  }
  return obj;
}

/**
 * Validates an incoming webhook checksum by removing `checksum` and
 * `checksumMethod` from the payload, then recomputing.
 */
function validateChecksum(payload, receivedChecksum) {
  const { checksum: _c, checksumMethod: _m, ...rest } = payload;
  const expected = createChecksum(rest);
  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(receivedChecksum, "hex")
  );
}

// ─── Phone normalization ────────────────────────────────────────────────────

/**
 * Normalizes a Tanzanian phone to E.164 digits (no '+').
 * ClickPesa expects numbers like "255712345678".
 */
function normalizePhone(input) {
  let digits = String(input).replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 9) digits = `255${digits}`;
  return digits;
}

// ─── Order reference ────────────────────────────────────────────────────────

/**
 * Generates a unique ClickPesa-compatible order reference.
 * ClickPesa: max 20 chars, alphanumeric only.
 * Format: CHG + 2-digit year + random 11 chars = 16 chars.
 */
function generateOrderReference(prefix = "CHG") {
  const year = String(new Date().getFullYear()).slice(-2);
  const random = crypto.randomBytes(6).toString("hex").toUpperCase().slice(0, 11);
  return `${prefix}${year}${random}`;
}

// ─── Generic ClickPesa API call ─────────────────────────────────────────────

async function clickPesaRequest(method, path, body = null, retryOn401 = true) {
  const token = await getToken(retryOn401);
  const url = `${CLICKPESA.baseUrl}${path}`;

  const headers = {
    Authorization: token,
    "Content-Type": "application/json",
  };

  const options = {
    method,
    headers,
    signal: AbortSignal.timeout(CLICKPESA.timeoutMs),
  };

  if (body) {
    // Add checksum if enabled
    if (CLICKPESA.useChecksum) {
      body.checksum = createChecksum(body);
    }
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  const responseBody = await res.json().catch(() => ({}));

  if (res.status === 401 && retryOn401) {
    cachedToken = null;
    tokenExpiresAt = 0;
    return clickPesaRequest(method, path, body, false);
  }

  return { status: res.status, data: responseBody };
}

// ─── USSD Push Collection ───────────────────────────────────────────────────

/**
 * Initiates a mobile money USSD push to collect a donation.
 * @param {Object} params
 * @param {number|string} params.amount - Amount in TZS
 * @param {string} params.phoneNumber - Donor's phone (any format, normalized internally)
 * @param {string} params.orderReference - Unique reference for idempotency
 * @returns {Object} ClickPesa response
 */
async function initiateUssdPush({ amount, phoneNumber, orderReference }) {
  const body = {
    amount: String(amount),
    currency: "TZS",
    orderReference,
    phoneNumber: normalizePhone(phoneNumber),
  };

  return clickPesaRequest("POST", "/payments/initiate-ussd-push-request", body);
}

// ─── Payment Query ──────────────────────────────────────────────────────────

/**
 * Queries the status of a collection/payment by order reference.
 * ClickPesa may return an array; we return the first item.
 * @param {string} orderReference
 * @returns {Object|null} Payment data or null if not found
 */
async function queryPayment(orderReference) {
  const { status, data } = await clickPesaRequest("GET", `/payments/${orderReference}`);
  if (status === 404) return null;
  if (status === 409) {
    // Duplicate reference — query existing
    return Array.isArray(data) ? data[0] : data;
  }
  if (Array.isArray(data)) return data[0] || null;
  return data;
}

// ─── Mobile Money Payout ────────────────────────────────────────────────────

/**
 * Previews a mobile money payout (fee quote + validation).
 * @param {Object} params
 * @param {number} params.amount - Amount in TZS
 * @param {string} params.phoneNumber - Recipient phone
 * @param {string} params.orderReference - Unique reference
 * @returns {Object} Preview data with fee breakdown
 */
async function previewPayout({ amount, phoneNumber, orderReference }) {
  const body = {
    amount: Number(amount),
    phoneNumber: normalizePhone(phoneNumber),
    currency: "TZS",
    orderReference,
  };

  return clickPesaRequest("POST", "/payouts/preview-mobile-money-payout", body);
}

/**
 * Creates a mobile money payout (sends money to a recipient).
 * @param {Object} params
 * @param {number} params.amount - Amount in TZS (what recipient should receive)
 * @param {string} params.phoneNumber - Recipient phone
 * @param {string} params.orderReference - Unique reference (must match preview)
 * @returns {Object} Payout creation response
 */
async function createPayout({ amount, phoneNumber, orderReference }) {
  const body = {
    amount: Number(amount),
    phoneNumber: normalizePhone(phoneNumber),
    currency: "TZS",
    orderReference,
  };

  return clickPesaRequest("POST", "/payouts/create-mobile-money-payout", body);
}

/**
 * Queries the status of a payout by order reference.
 * @param {string} orderReference
 * @returns {Object|null} Payout data or null
 */
async function queryPayout(orderReference) {
  const { status, data } = await clickPesaRequest("GET", `/payouts/${orderReference}`);
  if (status === 404) return null;
  if (Array.isArray(data)) return data[0] || null;
  return data;
}

module.exports = {
  CLICKPESA,
  getToken,
  createChecksum,
  validateChecksum,
  normalizePhone,
  generateOrderReference,
  clickPesaRequest,
  initiateUssdPush,
  queryPayment,
  previewPayout,
  createPayout,
  queryPayout,
};
