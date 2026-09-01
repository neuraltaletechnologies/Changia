/**
 * Cloudflare R2 object store (S3-compatible) for uploaded photos.
 *
 * Render's free web service has an ephemeral filesystem, so campaign / payout /
 * completion-report photos written to Backend/uploads/ would vanish on every
 * redeploy. When the R2_* env vars are set we push every upload to an R2 bucket
 * instead and stream it back through the API's own /uploads/... route (so no
 * frontend / CSP change is needed — the origin stays API_PUBLIC_URL).
 *
 * With the R2_* vars unset, isEnabled() is false and the app keeps using local
 * disk exactly as before (local dev, shared hosting with a persistent disk).
 */
const { AwsClient } = require("aws4fetch");
const { env } = require("../config");

const cfg = env.R2 || {};
const endpoint =
  cfg.endpoint ||
  (cfg.accountId ? `https://${cfg.accountId}.r2.cloudflarestorage.com` : "");

const enabled = Boolean(
  cfg.accessKeyId && cfg.secretAccessKey && cfg.bucket && endpoint
);

let client = null;
if (enabled) {
  client = new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    service: "s3",
    region: "auto",
  });
}

function isEnabled() {
  return enabled;
}

function objectUrl(key) {
  return `${endpoint}/${cfg.bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

async function putObject(key, buffer, contentType) {
  if (!enabled) throw new Error("R2 object store is not configured");
  const res = await client.fetch(objectUrl(key), {
    method: "PUT",
    body: buffer,
    headers: {
      "Content-Type": contentType || "application/octet-stream",
      "Content-Length": String(buffer.length),
    },
  });
  if (!res.ok) {
    throw new Error(`R2 PUT ${key} failed: ${res.status} ${await res.text()}`);
  }
}

/** Returns { buffer, contentType, contentLength } or null if the object is gone. */
async function getObject(key) {
  if (!enabled) return null;
  const res = await client.fetch(objectUrl(key), { method: "GET" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`R2 GET ${key} failed: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: res.headers.get("content-type") || "application/octet-stream",
    contentLength: res.headers.get("content-length") || String(arrayBuffer.byteLength),
  };
}

async function deleteObject(key) {
  if (!enabled) return;
  const res = await client.fetch(objectUrl(key), { method: "DELETE" });
  // 204 = deleted, 404 = already gone — both fine.
  if (!res.ok && res.status !== 404) {
    throw new Error(`R2 DELETE ${key} failed: ${res.status}`);
  }
}

module.exports = { objectStore: { isEnabled, putObject, getObject, deleteObject } };
