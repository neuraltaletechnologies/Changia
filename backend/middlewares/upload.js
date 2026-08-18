const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const { ApiError } = require("../utils/ApiError");

// Files land in Backend/uploads/completion-reports/<campaignId>/<random>.<ext>
// and are served back out at /uploads/... by app.js (express.static).
const UPLOAD_ROOT = path.join(__dirname, "..", "uploads", "completion-reports");

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(UPLOAD_ROOT, String(req.params.id));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || "";
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(ApiError.badRequest("Only JPEG, PNG or WEBP images are allowed", "INVALID_IMAGE_TYPE"));
    return;
  }
  cb(null, true);
}

/** Route middleware: accepts up to 8 images under the "images" field. */
const uploadCompletionImages = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
}).array("images", 8);

/** Best-effort cleanup for files multer already wrote to disk before a later
 *  validation step rejected the request (so failed submissions don't leak
 *  orphaned files). */
function deleteUploadedFiles(files) {
  for (const file of files || []) {
    fs.unlink(file.path, () => {});
  }
}

module.exports = { uploadCompletionImages, deleteUploadedFiles, UPLOAD_ROOT };
