import express from "express";
import { extractTool, downloadTool } from "../controllers/toolController.js";

const router = express.Router();

/* =========================================================
   HEALTH CHECK
========================================================= */

router.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Tools API is operational.",
    endpoints: {
      extract: "POST /api/tools/extract",
      download: "POST /api/tools/download",
    },
  });
});

/* =========================================================
   ROBUST ROUTE HANDLERS
========================================================= */

router.post("/extract", extractTool);
router.post("/extract/", extractTool);
router.get("/extract", (req, res) => {
  res.status(400).json({
    success: false,
    message: "Send a POST request with JSON body { url } to extract media.",
  });
});

router.post("/download", downloadTool);
router.post("/download/", downloadTool);
router.get("/download", (req, res) => {
  res.status(400).json({
    success: false,
    message: "Send a POST request with JSON body to download media.",
  });
});

export default router;
