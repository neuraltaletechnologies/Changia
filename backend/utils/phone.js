/**
 * Normalizes a Tanzanian phone number to E.164 digits (e.g. "0712345678" →
 * "255712345678"). Accepts "0..." and "+255..." prefixes.
 */
function normalizePhone(input) {
  let digits = String(input).replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 9) digits = `255${digits}`;
  return digits;
}

function isValidTZPhone(input) {
  return /^255[0-9]{9}$/.test(normalizePhone(input));
}

module.exports = { normalizePhone, isValidTZPhone };
