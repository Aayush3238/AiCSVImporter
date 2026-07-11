import express from "express";
import multer from "multer";
import { processCsvImport } from "../services/csvImportService.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

const IMPORT_TIMEOUT_MS = 5 * 60 * 1000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Import request timed out.")), ms)
    )
  ]);
}

router.post("/", upload.single("file"), async (req, res, next) => {
  try {
    const result = await withTimeout(
      processCsvImport(req.file),
      IMPORT_TIMEOUT_MS
    );
    res.json(result);
  } catch (error) {
    if (error.message === "Import request timed out.") {
      error.statusCode = 504;
    }
    next(error);
  }
});

export default router;
