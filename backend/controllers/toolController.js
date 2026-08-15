import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import axios from "axios";
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
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const getPlatform = (url) => {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    if (
      hostname === "youtube.com" ||
      hostname === "youtu.be" ||
      hostname.endsWith(".youtube.com")
    ) {
      return "youtube";
    }
    if (
      hostname === "facebook.com" ||
      hostname === "fb.watch" ||
      hostname.endsWith(".facebook.com")
    ) {
      return "facebook";
    }
    if (hostname === "instagram.com" || hostname.endsWith(".instagram.com")) {
      return "instagram";
    }
    if (
      hostname === "pinterest.com" ||
      hostname === "pin.it" ||
      hostname.endsWith(".pinterest.com")
    ) {
      return "pinterest";
    }
    return "unknown";
  } catch {
    return "unknown";
  }
};

const cleanFileName = (name) => {
  return String(name || "download")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
};

const getFormat = (quality) => {
  const value = String(quality || "best").toLowerCase();
  switch (value) {
    case "360":
    case "360p":
      return "18/bestvideo[height<=360]+bestaudio/best[height<=360]/best";
    case "480":
    case "480p":
      return "bestvideo[height<=480]+bestaudio/best[height<=480]/best";
    case "720":
    case "720p":
      return "22/bestvideo[height<=720]+bestaudio/best[height<=720]/best";
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

  if (!text) return "Unable to process this URL.";
  if (
    text.includes("Sign in") ||
    text.includes("login required") ||
    text.includes("authentication") ||
    text.includes("confirm you're not a bot")
  ) {
    return "This media requires login/authentication or is bot-protected. Only publicly accessible media is supported.";
  }
  if (text.includes("Private video") || text.includes("private")) {
    return "This content is private and cannot be downloaded.";
  }
  if (text.includes("Video unavailable") || text.includes("unavailable")) {
    return "The media is unavailable or has been removed.";
  }
  if (text.includes("HTTP Error 403") || text.includes("403 Forbidden")) {
    return "The media server returned HTTP 403 Forbidden.";
  }
  if (text.includes("HTTP Error 429")) {
    return "Rate limit exceeded. Please try again later.";
  }
  return text.slice(-300);
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
   EXTRACT TOOL
========================================================= */

export const extractTool = async (req, res) => {
  try {
    const { url, platform } = req.body || {};

    if (!url || !validateUrl(url)) {
      return res.status(400).json({
        success: false,
        message: "A valid media URL is required.",
      });
    }

    const detectedPlatform = getPlatform(url);
    if (detectedPlatform === "unknown") {
      return res.status(400).json({
        success: false,
        message: "This platform is not supported.",
      });
    }

    logger?.info?.(`TOOL EXTRACT | platform=${detectedPlatform} | url=${url}`);

    const result = await ytDlp(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noPlaylist: true,
      skipDownload: true,
      preferFreeFormats: true,
      noCheckCertificates: true,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "No media information found for this URL.",
      });
    }

    const formats = Array.isArray(result.formats) ? result.formats : [];

    const isPhoto =
      result._type === "image" ||
      result.ext === "jpg" ||
      result.ext === "jpeg" ||
      result.ext === "png" ||
      result.ext === "webp" ||
      (!formats.length && Boolean(result.thumbnail || result.url)) ||
      formats.every((f) => f.vcodec === "none" && f.acodec === "none");

    const availableQualities = [
      ...new Set(
        formats
          .map((item) => Number(item.height))
          .filter((h) => Number.isFinite(h) && h > 0)
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
        url: result.url || null,
        duration: result.duration || 0,
        uploader: result.uploader || result.channel || null,
        platform: detectedPlatform,
        webpageUrl: result.webpage_url || url,
        originalUrl: url,
        isPhoto,
        qualities: availableQualities,
        formats: formats
          .filter(
            (item) => item && (item.vcodec !== "none" || item.acodec !== "none")
          )
          .map((item) => ({
            formatId: item.format_id || null,
            ext: item.ext || null,
            quality: item.format_note || null,
            height: item.height || null,
            width: item.width || null,
            fps: item.fps || null,
            filesize: item.filesize || item.filesize_approx || null,
            directUrl: item.url || null,
            hasVideo: Boolean(item.vcodec && item.vcodec !== "none"),
            hasAudio: Boolean(item.acodec && item.acodec !== "none"),
          }))
          .slice(0, 100),
      },
    });
  } catch (error) {
    const message = getYtDlpErrorMessage(error);
    logger?.error?.(`TOOL EXTRACT ERROR: ${message}`);
    return res.status(500).json({
      success: false,
      message,
    });
  }
};

/* =========================================================
   DOWNLOAD TOOL (FAST STREAMING + YT-DLP FALLBACK)
========================================================= */

export const downloadTool = async (req, res) => {
  let outputFile = null;

  try {
    const { url, quality, format, formatId, isPhoto, directUrl, title } =
      req.body || {};

    const sourceUrl = url?.trim();

    if (!sourceUrl || !validateUrl(sourceUrl)) {
      return res.status(400).json({
        success: false,
        message: "A valid media URL is required.",
      });
    }

    ensureTempDirectory();
    const requestId = crypto.randomBytes(12).toString("hex");
    const cleanBaseTitle = cleanFileName(title);

    /* --------------------------------------------------------
       1. FAST DIRECT STREAM (For Photos & Direct MP4 URLs)
    -------------------------------------------------------- */
    const candidateDirectUrl = directUrl || (isPhoto ? sourceUrl : null);

    if (candidateDirectUrl && validateUrl(candidateDirectUrl)) {
      try {
        const streamResponse = await axios({
          method: "GET",
          url: candidateDirectUrl,
          responseType: "stream",
          timeout: 60000,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          },
        });

        const contentType =
          streamResponse.headers["content-type"] || "application/octet-stream";

        let ext = isPhoto ? ".jpg" : ".mp4";
        if (contentType.includes("png")) ext = ".png";
        else if (contentType.includes("webp")) ext = ".webp";
        else if (contentType.includes("webm")) ext = ".webm";

        const finalName = `${cleanBaseTitle}${ext}`;

        res.status(200);
        res.setHeader("Content-Type", contentType);
        if (streamResponse.headers["content-length"]) {
          res.setHeader(
            "Content-Length",
            streamResponse.headers["content-length"]
          );
        }
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${encodeURIComponent(finalName)}"`
        );
        res.setHeader("Cache-Control", "no-store");

        return streamResponse.data.pipe(res);
      } catch (streamErr) {
        logger?.warn?.(`Direct stream failed, falling back to yt-dlp: ${streamErr.message}`);
      }
    }

    /* --------------------------------------------------------
       2. FAST YT-DLP EXECUTION WITH OPTIMIZED FLAGS
    -------------------------------------------------------- */
    const baseFile = path.join(TEMP_DIR, `download-${requestId}`);

    let selectedFormat;
    if (formatId) {
      selectedFormat = `${formatId}+bestaudio/${formatId}/best`;
    } else if (format) {
      selectedFormat = getFormat(format);
    } else {
      selectedFormat = getFormat(quality);
    }

    logger?.info?.(`TOOL DOWNLOAD START: url=${sourceUrl} | format=${selectedFormat}`);

    await ytDlp(sourceUrl, {
      output: `${baseFile}.%(ext)s`,
      format: selectedFormat,
      noPlaylist: true,
      noWarnings: true,
      noCheckCertificates: true,
      mergeOutputFormat: "mp4",
      maxFilesize: "500M",
      retries: 3,
      fragmentRetries: 3,
      concurrentFragments: 5,
      bufferSize: "16K",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    });

    const files = await fs.promises.readdir(TEMP_DIR);
    const generatedFiles = files.filter((file) =>
      file.startsWith(`download-${requestId}.`)
    );

    if (generatedFiles.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Download failed because the output file was not found.",
      });
    }

    const preferred =
      generatedFiles.find(
        (file) => path.extname(file).toLowerCase() === ".mp4"
      ) || generatedFiles[0];

    outputFile = path.join(TEMP_DIR, preferred);
    const stats = await fs.promises.stat(outputFile);

    if (!stats.isFile() || stats.size <= 0) {
      return res.status(500).json({
        success: false,
        message: "Generated file is empty or corrupted.",
      });
    }

    const extension = path.extname(outputFile).toLowerCase() || ".mp4";
    const finalName = `${cleanBaseTitle}${extension}`;

    res.status(200);
    res.setHeader(
      "Content-Type",
      extension === ".mp4"
        ? "video/mp4"
        : extension === ".webm"
        ? "video/webm"
        : "application/octet-stream"
    );
    res.setHeader("Content-Length", stats.size);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(finalName)}"`
    );
    res.setHeader("Cache-Control", "no-store");

    const readStream = fs.createReadStream(outputFile);

    readStream.on("error", async (err) => {
      logger?.error?.(`Stream error: ${err.message}`);
      await removeFile(outputFile);
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: "Failed while streaming the file.",
        });
      }
      res.destroy(err);
    });

    readStream.on("close", async () => {
      await removeFile(outputFile);
    });

    readStream.pipe(res);
  } catch (error) {
    if (outputFile) await removeFile(outputFile);
    const message = getYtDlpErrorMessage(error);
    logger?.error?.(`TOOL DOWNLOAD ERROR: ${message}`);

    if (res.headersSent) {
      return res.destroy(error);
    }

    return res.status(500).json({
      success: false,
      message,
    });
  }
};
