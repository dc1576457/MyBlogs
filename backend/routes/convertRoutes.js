import express from "express";
import {
  convertPostmanToCurl,
  saveConversion,
  getHistory,
  proxyExecuteRequest,
  deleteHistoryItem,
  getAdminConversionHistory,
  deleteConversionHistory,
} from "../controllers/convertController.js";
import { protect, adminOnly, optionalAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// Proxy Runner (Bypasses CORS)
router.post("/execute", proxyExecuteRequest);

// Postman Converter
router.post("/postman-to-curl", convertPostmanToCurl);

// History CRUD
router.post("/save", optionalAuth, saveConversion);
router.get("/history", getHistory);
router.delete("/history/:id", deleteHistoryItem);

// Admin Conversion History Routes
router.get("/admin/history", protect, adminOnly, getAdminConversionHistory);
router.delete("/admin/history/:id", protect, adminOnly, deleteConversionHistory);

export default router;