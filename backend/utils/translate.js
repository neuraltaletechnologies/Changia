/**
 * English → Swahili machine translation via the Google Cloud Translation v2
 * REST API. Used to keep the campaign *_sw columns in sync automatically when
 * the English content is saved (see modules/campaign/service.js).
 *
 * Best-effort by design: with no GOOGLE_TRANSLATE_API_KEY configured, or on any
 * network/API error, every function resolves to null and the caller simply
 * leaves the Swahili column untouched (public /sw pages fall back to English).
 */
const { env } = require("../config");

const isEnabled = () => Boolean(env.GOOGLE_TRANSLATE_API_KEY);

/**
 * Translate a single string to Swahili. Returns null when translation is
 * disabled, the input is empty, or the request fails.
 * @param {string} text
 * @returns {Promise<string|null>}
 */
async function translateToSwahili(text) {
  const trimmed = (text || "").trim();
  if (!trimmed || !isEnabled()) return null;

  try {
    const res = await fetch(
      `${env.GOOGLE_TRANSLATE_ENDPOINT}?key=${encodeURIComponent(env.GOOGLE_TRANSLATE_API_KEY)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: trimmed,
          source: "en",
          target: "sw",
          format: "text",
        }),
        signal: AbortSignal.timeout(15000),
      }
    );
    if (!res.ok) {
      console.warn(`[translate] Google API responded ${res.status}`);
      return null;
    }
    const payload = await res.json();
    const out = payload?.data?.translations?.[0]?.translatedText;
    return typeof out === "string" && out.trim() ? out : null;
  } catch (err) {
    console.warn(`[translate] failed: ${err.message}`);
    return null;
  }
}

/**
 * Translate several named fields at once. Only non-empty values are sent; the
 * result contains a key only for fields that translated successfully.
 * @param {Record<string, string|null|undefined>} fields
 * @returns {Promise<Record<string, string>>}
 */
async function translateFields(fields) {
  if (!isEnabled()) return {};
  const entries = Object.entries(fields).filter(([, v]) => (v || "").trim());
  const results = await Promise.all(
    entries.map(async ([key, value]) => [key, await translateToSwahili(value)])
  );
  return Object.fromEntries(results.filter(([, v]) => v));
}

module.exports = { translateToSwahili, translateFields, isTranslationEnabled: isEnabled };
