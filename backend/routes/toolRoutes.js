import express from "express";
import { extractTool, downloadTool } from "../controllers/toolController.js";

const router = express.Router();

/* =========================================================
   TOOL API HEALTH
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
   ACTIONS
========================================================= */

router.post("/extract", extractTool);
router.post("/download", downloadTool);

export default router;
