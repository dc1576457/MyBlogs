import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import ytDlp from "youtube-dl-exec";
import { logger } from "../utils/logger.js";

const TEMP_DIR = path.join(os.tmpdir(), "myblog-tools");

const ensureTempDirectory = () => {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
};

const validateUrl = (value) => {
  if (!value || typeof value !== "string") return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const getPlatform = (url) => {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    if (hostname === "youtube.com" || hostname === "youtu.be" || hostname.endsWith(".youtube.com")) return "youtube";
    if (hostname === "facebook.com" || hostname === "fb.watch" || hostname.endsWith(".facebook.com")) return "facebook";
    if (hostname === "instagram.com" || hostname.endsWith(".instagram.com")) return "instagram";
    if (hostname === "pinterest.com" || hostname === "pin.it" || hostname.endsWith(".pinterest.com")) return "pinterest";
    return "unknown";
  } catch {
    return "unknown";
  }
};

const cleanFileName = (name) => {
  return String(name || "video")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
};

const getFormat = (quality) => {
  const value = String(quality || "best").toLowerCase();
  switch (value) {
    case "360":
    case "360p":
      return "bestvideo[height<=360]+bestaudio/best[height<=360]/best";
    case "480":
    case "480p":
      return "bestvideo[height<=480]+bestaudio/best[height<=480]/best";
    case "720":
    case "720p":
      return "bestvideo[height<=720]+bestaudio/best[height<=720]/best";
    case "1080":
    case "1080p":
      return "bestvideo[height<=1080]+bestaudio/best[height<=1080]/best";
    default:
      return "bestvideo+bestaudio/best";
  }
};

const getYtDlpErrorMessage = (error) => {
  const stderr = error?.stderr || error?.stdout || error?.message || "";
  const text = String(stderr).trim();
  if (!text) return "Processing failed for this URL.";
  if (text.includes("Sign in") || text.includes("login required") || text.includes("authentication")) {
    return "This media requires login or authentication. Only publicly accessible media is supported.";
  }
  if (text.includes("Private video") || text.includes("private")) {
    return "This media is private and cannot be accessed.";
  }
  if (text.includes("Video unavailable") || text.includes("unavailable")) {
    return "The media is unavailable or has been removed.";
  }
  if (text.includes("HTTP Error 403") || text.includes("403 Forbidden")) {
    return "The platform blocked the request (HTTP 403). Datacenter access might be restricted.";
  }
  if (text.includes("HTTP Error 429")) {
    return "Rate limit exceeded on the target platform. Please try again later.";
  }
  return text.slice(-500);
};

const removeFile = async (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (error) {
    logger?.warn?.(`Could not remove temp file: ${filePath} | ${error.message}`);
  }
};

/* =========================================================
   EXTRACT
========================================================= */
export const extractTool = async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url || !validateUrl(url)) {
      return res.status(400).json({ success: false, message: "Valid URL is required." });
    }

    const detectedPlatform = getPlatform(url);
    if (detectedPlatform === "unknown") {
      return res.status(400).json({ success: false, message: "Platform not supported." });
    }

    const result = await ytDlp(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noPlaylist: true,
      skipDownload: true,
      preferFreeFormats: true,
      noCheckCertificates: true,
    });

    if (!result) {
      return res.status(404).json({ success: false, message: "No media information found." });
    }

    const formats = Array.isArray(result.formats) ? result.formats : [];
    const isPhoto =
      (!formats.length && Boolean(result.url || result.thumbnail)) ||
      result.ext === "jpg" ||
      result.ext === "png" ||
      result.ext === "webp" ||
      formats.every((f) => f.vcodec === "none" && f.acodec === "none");

    const availableQualities = [
      ...new Set(
        formats
          .map((item) => Number(item.height))
          .filter((height) => Number.isFinite(height) && height > 0)
      ),
    ]
      .sort((a, b) => b - a)
      .slice(0, 10);

    return res.status(200).json({
      success: true,
      data: {
        id: result.id || null,
        title: result.title || "Untitled Media",
        description: result.description || "",
        thumbnail: result.thumbnail || result.url || null,
        duration: result.duration || 0,
        uploader: result.uploader || result.channel || null,
        platform: detectedPlatform,
        webpageUrl: result.webpage_url || url,
        originalUrl: url,
        isPhoto,
        qualities: availableQualities,
        formats: formats
          .filter((item) => item && (item.vcodec !== "none" || item.acodec !== "none"))
          .map((item) => ({
            formatId: item.format_id || null,
            ext: item.ext || null,
            quality: item.format_note || null,
            height: item.height || null,
            width: item.width || null,
            filesize: item.filesize || item.filesize_approx || null,
          }))
          .slice(0, 100),
      },
    });
  } catch (error) {
    const message = getYtDlpErrorMessage(error);
    return res.status(500).json({ success: false, message });
  }
};

/* =========================================================
   DOWNLOAD
========================================================= */
export const downloadTool = async (req, res) => {
  let outputFile = null;
  try {
    const { url, quality, format, formatId } = req.body || {};
    if (!url || !validateUrl(url)) {
      return res.status(400).json({ success: false, message: "Valid URL is required." });
    }

    ensureTempDirectory();
    const requestId = crypto.randomBytes(12).toString("hex");
    const baseFile = path.join(TEMP_DIR, `download-${requestId}`);

    let selectedFormat;
    if (formatId) {
      selectedFormat = `${formatId}+bestaudio/${formatId}/best`;
    } else if (format) {
      selectedFormat = getFormat(format);
    } else {
      selectedFormat = getFormat(quality);
    }

    await ytDlp(url, {
      output: `${baseFile}.%(ext)s`,
      format: selectedFormat,
      noPlaylist: true,
      noWarnings: true,
      noCheckCertificates: true,
      mergeOutputFormat: "mp4",
      maxFilesize: "500M",
      retries: 3,
    });

    const files = await fs.promises.readdir(TEMP_DIR);
    const generatedFiles = files.filter((file) => file.startsWith(`download-${requestId}.`));

    if (generatedFiles.length === 0) {
      return res.status(500).json({ success: false, message: "Download output was not found." });
    }

    const preferred =
      generatedFiles.find((file) => path.extname(file).toLowerCase() === ".mp4") || generatedFiles[0];

    outputFile = path.join(TEMP_DIR, preferred);
    const stats = await fs.promises.stat(outputFile);
    const extension = path.extname(outputFile).toLowerCase() || ".mp4";
    const title = cleanFileName(req.body?.title || "download");
    const finalName = `${title}${extension}`;

    res.status(200);
    res.setHeader("Content-Type", extension === ".mp4" ? "video/mp4" : "application/octet-stream");
    res.setHeader("Content-Length", stats.size);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(finalName)}"`);

    const readStream = fs.createReadStream(outputFile);
    readStream.on("close", () => removeFile(outputFile));
    readStream.pipe(res);
  } catch (error) {
    if (outputFile) await removeFile(outputFile);
    const message = getYtDlpErrorMessage(error);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message });
    }
  }
};
