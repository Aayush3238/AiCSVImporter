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

router.post("/", upload.single("file"), async (req, res, next) => {
  try {
    const result = await processCsvImport(req.file);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
