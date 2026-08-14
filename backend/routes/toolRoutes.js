import express from "express";

import {
  extractTool,
  downloadTool,
} from "../controllers/toolController.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Extract video information
|--------------------------------------------------------------------------
*/

router.post(
  "/extract",
  extractTool
);

/*
|--------------------------------------------------------------------------
| Download selected quality
|--------------------------------------------------------------------------
*/

router.post(
  "/download",
  downloadTool
);

export default router;