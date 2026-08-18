const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const { ApiError } = require("../utils/ApiError");

// Files land in Backend/uploads/<subdir>/<campaignId>/<random>.<ext> and are
// served back out at /uploads/... by app.js (express.static).
const UPLOADS_BASE = path.join(__dirname, "..", "uploads");
const UPLOAD_ROOT = path.join(UPLOADS_BASE, "completion-reports");
const CAMPAIGN_IMAGES_ROOT = path.join(UPLOADS_BASE, "campaigns");

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function makeStorage(root) {
  return multer.diskStorage({
    destination(req, file, cb) {
      const dir = path.join(root, String(req.params.id));
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase() || "";
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
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
  storage: makeStorage(UPLOAD_ROOT),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
}).array("images", 8);

/** Route middleware: accepts one "cover" file + up to 8 "gallery" files. */
const uploadCampaignImages = multer({
  storage: makeStorage(CAMPAIGN_IMAGES_ROOT),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 9 },
}).fields([
  { name: "cover", maxCount: 1 },
  { name: "gallery", maxCount: 8 },
]);

/** Best-effort cleanup for files multer already wrote to disk before a later
 *  validation step rejected the request (so failed submissions don't leak
 *  orphaned files). Accepts a flat array (`.array()` output) or the
 *  `{ fieldName: File[] }` shape `.fields()` produces. */
function deleteUploadedFiles(files) {
  const list = Array.isArray(files) ? files : Object.values(files || {}).flat();
  for (const file of list) {
    fs.unlink(file.path, () => {});
  }
}

module.exports = {
  uploadCompletionImages,
  uploadCampaignImages,
  deleteUploadedFiles,
  UPLOAD_ROOT,
  CAMPAIGN_IMAGES_ROOT,
};
