const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const { ApiError } = require("../utils/ApiError");
const { objectStore } = require("../utils/objectStore");

// Files land in Backend/uploads/<subdir>/<id>/<random>.<ext> and are served back
// out at /uploads/... by app.js. When Cloudflare R2 is configured
// (objectStore.isEnabled()) the same key is stored in R2 instead of on disk and
// streamed back through that same /uploads/... route — the web path written to
// the DB is identical either way ("/uploads/<subdir>/<id>/<file>").
const UPLOADS_BASE = path.join(__dirname, "..", "uploads");
const UPLOAD_ROOT = path.join(UPLOADS_BASE, "completion-reports");
const CAMPAIGN_IMAGES_ROOT = path.join(UPLOADS_BASE, "campaigns");
const PAYOUT_IMAGES_ROOT = path.join(UPLOADS_BASE, "payouts");
const TESTIMONIAL_IMAGES_ROOT = path.join(UPLOADS_BASE, "testimonials");

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function makeFilename(originalname) {
  const ext = path.extname(originalname || "").toLowerCase() || "";
  return `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
}

/** multer StorageEngine that streams each file straight into Cloudflare R2.
 *  Sets file.filename / file.path to mirror diskStorage so the service layer
 *  (which builds "/uploads/<subdir>/<id>/<filename>") is unchanged. */
function makeR2Storage(subdir) {
  return {
    _handleFile(req, file, cb) {
      const chunks = [];
      file.stream.on("data", (c) => chunks.push(c));
      file.stream.on("error", cb);
      file.stream.on("end", () => {
        const buffer = Buffer.concat(chunks);
        const filename = makeFilename(file.originalname);
        const key = `${subdir}/${req.params.id}/${filename}`;
        objectStore
          .putObject(key, buffer, file.mimetype)
          .then(() =>
            cb(null, {
              filename,
              path: `/uploads/${key}`,
              key,
              storage: "r2",
              size: buffer.length,
            })
          )
          .catch(cb);
      });
    },
    _removeFile(req, file, cb) {
      objectStore
        .deleteObject(file.key)
        .then(() => cb(null))
        .catch(cb);
    },
  };
}

function makeStorage(root, subdir) {
  if (objectStore.isEnabled()) return makeR2Storage(subdir);
  return multer.diskStorage({
    destination(req, file, cb) {
      const dir = path.join(root, String(req.params.id));
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename(req, file, cb) {
      cb(null, makeFilename(file.originalname));
    },
  });
}

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(ApiError.badRequest("Only JPEG, PNG or WEBP images are allowed", "INVALID_IMAGE_TYPE"));
    return;
  }
  cb(null, true);
}

/** Route middleware: accepts up to 8 images under the "images" field. */
const uploadCompletionImages = multer({
  storage: makeStorage(UPLOAD_ROOT, "completion-reports"),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
}).array("images", 8);

/** Route middleware: accepts one "cover" file + up to 8 "gallery" files. */
const uploadCampaignImages = multer({
  storage: makeStorage(CAMPAIGN_IMAGES_ROOT, "campaigns"),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 9 },
}).fields([
  { name: "cover", maxCount: 1 },
  { name: "gallery", maxCount: 8 },
]);

/** Route middleware: optional payout "proof of use" photos — up to 5 files
 *  under the "proof" field. */
const uploadPayoutProof = multer({
  storage: makeStorage(PAYOUT_IMAGES_ROOT, "payouts"),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
}).array("proof", 5);

/** Route middleware: a single testimonial portrait under the "photo" field.
 *  Stored at /uploads/testimonials/<id>/<file>. */
const uploadTestimonialPhoto = multer({
  storage: makeStorage(TESTIMONIAL_IMAGES_ROOT, "testimonials"),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
}).single("photo");

// ─── Bulk-import spreadsheet upload ─────────────────────────────────────────
// A single .csv / .xlsx file under the "file" field, kept in memory (never
// persisted — the buffer is parsed then discarded). Used by modules/data-transfer.
const IMPORT_MIME_TYPES = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream", // some browsers send this for .csv
]);

function importFileFilter(req, file, cb) {
  const okExt = /\.(csv|xlsx)$/i.test(file.originalname || "");
  if (!okExt && !IMPORT_MIME_TYPES.has(file.mimetype)) {
    cb(ApiError.badRequest("Upload a .csv or .xlsx file", "INVALID_IMPORT_FILE"));
    return;
  }
  cb(null, true);
}

const uploadImportFile = multer({
  storage: multer.memoryStorage(),
  fileFilter: importFileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
}).single("file");

/** Removes uploaded images from whichever store backs them. Accepts:
 *   - multer file objects (`.array()` output, or the `{ field: File[] }` shape
 *     from `.fields()`) — cleanup of files a later validation step rejected;
 *   - `{ path: "/uploads/<subdir>/<id>/<file>" }` items — a stored image the
 *     service layer wants gone (see uploadWebPathToDiskPath in the services).
 *  Best-effort: failures are swallowed so a delete never breaks the request. */
function deleteUploadedFiles(files) {
  const list = Array.isArray(files) ? files : Object.values(files || {}).flat();
  for (const file of list) {
    if (!file) continue;

    // Freshly-uploaded multer file that went straight to R2.
    if (file.storage === "r2" && file.key) {
      objectStore.deleteObject(file.key).catch(() => {});
      continue;
    }

    const p = file.path;
    if (!p || typeof p !== "string") continue;

    // A stored web path — route it to the active store.
    if (p.startsWith("/uploads/")) {
      const key = p.slice("/uploads/".length);
      if (objectStore.isEnabled()) {
        objectStore.deleteObject(key).catch(() => {});
      } else {
        fs.unlink(path.join(UPLOADS_BASE, key), () => {});
      }
      continue;
    }

    // An absolute disk path straight from multer's diskStorage.
    fs.unlink(p, () => {});
  }
}

module.exports = {
  uploadCompletionImages,
  uploadCampaignImages,
  uploadPayoutProof,
  uploadTestimonialPhoto,
  uploadImportFile,
  deleteUploadedFiles,
  UPLOADS_BASE,
  UPLOAD_ROOT,
  CAMPAIGN_IMAGES_ROOT,
  PAYOUT_IMAGES_ROOT,
  TESTIMONIAL_IMAGES_ROOT,
};
