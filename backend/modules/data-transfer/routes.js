const { Router } = require("express");
const { authenticate } = require("../../middlewares/auth");
const { uploadImportFile } = require("../../middlewares/upload");
const controller = require("./controller");

// One dispatcher router for bulk CSV / XLSX export + import across datasets.
// Per-dataset role checks live in the controller (driven by ./datasets.js), so
// there is a single set of routes rather than one router per feature module.
const router = Router();

router.use(authenticate);

router.get("/:dataset/export", controller.exportDataset);
router.get("/:dataset/import-template", controller.downloadTemplate);
router.post("/:dataset/import", uploadImportFile, controller.importDataset);

module.exports = router;
