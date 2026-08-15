import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";

import ytDlp from "youtube-dl-exec";

import { logger } from "../utils/logger.js";

/* =========================================================
   CONSTANTS
========================================================= */

const TEMP_DIR = path.join(
  os.tmpdir(),
  "myblog-tools"
);

/* =========================================================
   CREATE TEMP DIRECTORY
========================================================= */

const ensureTempDirectory = () => {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, {
      recursive: true,
    });
  }
};

/* =========================================================
   VALIDATE URL
========================================================= */

const validateUrl = (value) => {
  if (!value || typeof value !== "string") {
    return false;
  }

  try {
    const parsed = new URL(value);

    return (
      parsed.protocol === "http:" ||
      parsed.protocol === "https:"
    );
  } catch {
    return false;
  }
};

/* =========================================================
   GET PLATFORM
========================================================= */

const getPlatform = (url) => {
  try {
    const hostname = new URL(url)
      .hostname
      .toLowerCase()
      .replace(/^www\./, "");

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

    if (
      hostname === "instagram.com" ||
      hostname.endsWith(".instagram.com")
    ) {
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

/* =========================================================
   CLEAN FILENAME
========================================================= */

const cleanFileName = (name) => {
  return String(name || "video")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
};

/* =========================================================
   GET QUALITY FORMAT
========================================================= */

const getFormat = (quality) => {
  const value = String(
    quality || "best"
  ).toLowerCase();

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

    case "1440":
    case "1440p":
      return "bestvideo[height<=1440]+bestaudio/best[height<=1440]/best";

    case "2160":
    case "2160p":
    case "4k":
      return "bestvideo[height<=2160]+bestaudio/best[height<=2160]/best";

    case "audio":
    case "mp3":
      return "bestaudio/best";

    case "best":
    default:
      return "bestvideo+bestaudio/best";
  }
};

/* =========================================================
   ERROR MESSAGE CLEANER
========================================================= */

const getYtDlpErrorMessage = (error) => {
  const stderr =
    error?.stderr ||
    error?.stdout ||
    error?.message ||
    "";

  const text = String(stderr).trim();

  if (!text) {
    return "yt-dlp failed to process this URL.";
  }

  if (
    text.includes("Sign in") ||
    text.includes("login required") ||
    text.includes("authentication")
  ) {
    return "This video requires login or authentication. Only publicly accessible videos are supported.";
  }

  if (
    text.includes("Private video") ||
    text.includes("private")
  ) {
    return "This video is private and cannot be downloaded.";
  }

  if (
    text.includes("Video unavailable") ||
    text.includes("video unavailable")
  ) {
    return "The video is unavailable or has been removed.";
  }

  if (
    text.includes("Unsupported URL") ||
    text.includes("Unsupported url")
  ) {
    return "This URL is not supported.";
  }

  if (
    text.includes("HTTP Error 403") ||
    text.includes("403 Forbidden")
  ) {
    return "The platform rejected the download request (HTTP 403).";
  }

  if (
    text.includes("HTTP Error 429") ||
    text.includes("Too Many Requests")
  ) {
    return "Too many requests were made to the platform. Please try again later.";
  }

  if (
    text.includes("ffmpeg") &&
    text.includes("not found")
  ) {
    return "FFmpeg is not available on the server.";
  }

  // Don't expose huge yt-dlp output to frontend
  return text.slice(-1000);
};

/* =========================================================
   CLEAN TEMP FILE
========================================================= */

const removeFile = async (filePath) => {
  try {
    if (
      filePath &&
      fs.existsSync(filePath)
    ) {
      await fs.promises.unlink(filePath);
    }
  } catch (error) {
    logger.warn(
      `Could not remove temporary file: ${filePath} | ${error.message}`
    );
  }
};

/* =========================================================
   EXTRACT TOOL
========================================================= */

export const extractTool = async (
  req,
  res
) => {
  try {
    const {
      url,
      platform,
    } = req.body || {};

    if (!url) {
      return res.status(400).json({
        success: false,
        message: "Video URL is required.",
      });
    }

    if (!validateUrl(url)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid video URL.",
      });
    }

    const detectedPlatform =
      getPlatform(url);

    if (detectedPlatform === "unknown") {
      return res.status(400).json({
        success: false,
        message:
          "This platform is not supported.",
      });
    }

    logger.info(
      `TOOL EXTRACT | platform=${detectedPlatform} | url=${url}`
    );

    const result = await ytDlp(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noPlaylist: true,
      skipDownload: true,
      preferFreeFormats: true,
      noCheckCertificates: true,
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message:
          "No video information was found.",
      });
    }

    const formats = Array.isArray(
      result.formats
    )
      ? result.formats
      : [];

    const availableQualities = [
      ...new Set(
        formats
          .map((item) =>
            Number(item.height)
          )
          .filter(
            (height) =>
              Number.isFinite(height) &&
              height > 0
          )
      ),
    ]
      .sort((a, b) => b - a)
      .slice(0, 10);

    return res.status(200).json({
      success: true,

      data: {
        id: result.id || null,

        title:
          result.title ||
          "Untitled video",

        description:
          result.description ||
          "",

        thumbnail:
          result.thumbnail ||
          null,

        duration:
          result.duration ||
          0,

        uploader:
          result.uploader ||
          result.channel ||
          null,

        platform:
          detectedPlatform,

        webpageUrl:
          result.webpage_url ||
          url,

        originalUrl: url,

        requestedPlatform:
          platform || null,

        qualities:
          availableQualities,

        formats: formats
          .filter(
            (item) =>
              item &&
              (
                item.vcodec !== "none" ||
                item.acodec !== "none"
              )
          )
          .map((item) => ({
            formatId:
              item.format_id || null,

            ext:
              item.ext || null,

            quality:
              item.format_note ||
              null,

            height:
              item.height || null,

            width:
              item.width || null,

            fps:
              item.fps || null,

            filesize:
              item.filesize ||
              item.filesize_approx ||
              null,

            hasVideo:
              item.vcodec &&
              item.vcodec !== "none",

            hasAudio:
              item.acodec &&
              item.acodec !== "none",
          }))
          .slice(0, 100),
      },
    });
  } catch (error) {
    const message =
      getYtDlpErrorMessage(error);

    logger.error(`
============================================================
TOOL EXTRACT ERROR
============================================================

Message:
${message}

Original Error:
${error?.message || "N/A"}

Stack:
${error?.stack || "N/A"}

============================================================
`);

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

/* =========================================================
   DOWNLOAD TOOL
========================================================= */

export const downloadTool = async (
  req,
  res
) => {
  let outputFile = null;

  try {
    const {
      url,
      quality,
      format,
      platform,
      formatId,
      directUrl,
    } = req.body || {};

    /*
     * Support both:
     *
     * {
     *   url,
     *   quality
     * }
     *
     * and:
     *
     * {
     *   url,
     *   quality,
     *   formatId
     * }
     */

    const sourceUrl =
      directUrl || url;

    if (!sourceUrl) {
      return res.status(400).json({
        success: false,
        message:
          "Video URL is required.",
      });
    }

    if (!validateUrl(sourceUrl)) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide a valid video URL.",
      });
    }

    const detectedPlatform =
      getPlatform(sourceUrl);

    if (
      detectedPlatform === "unknown" &&
      !directUrl
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This platform is not supported.",
      });
    }

    ensureTempDirectory();

    const requestId =
      crypto
        .randomBytes(12)
        .toString("hex");

    const baseFile =
      path.join(
        TEMP_DIR,
        `download-${requestId}`
      );

    /*
     * If a specific formatId is supplied from
     * extraction, use it.
     *
     * Otherwise use quality.
     */

    let selectedFormat;

    if (formatId) {
      selectedFormat =
        `${formatId}+bestaudio/${formatId}/best`;
    } else if (format) {
      selectedFormat =
        getFormat(format);
    } else {
      selectedFormat =
        getFormat(quality);
    }

    logger.info(`
============================================================
TOOL DOWNLOAD START
============================================================

Platform:
${platform || detectedPlatform}

URL:
${sourceUrl}

Quality:
${quality || "best"}

Format:
${format || "default"}

Format ID:
${formatId || "none"}

Selected Format:
${selectedFormat}

Request ID:
${requestId}

============================================================
`);

    /*
     * Output:
     *
     * /tmp/myblog-tools/download-xxxx.%(ext)s
     *
     * yt-dlp chooses the final extension.
     */

    const outputTemplate =
      `${baseFile}.%(ext)s`;

    const result =
      await ytDlp(
        sourceUrl,
        {
          output:
            outputTemplate,

          format:
            selectedFormat,

          noPlaylist: true,

          noWarnings: true,

          noCheckCertificates: true,

          mergeOutputFormat: "mp4",

          restrictFilenames: true,

          windowsFilenames: true,

          /*
           * Avoid downloading unnecessarily
           * huge playlists/files.
           */

          maxFilesize: "500M",

          /*
           * Retry temporary network failures.
           */

          retries: 3,

          fragmentRetries: 3,

          concurrentFragments: 4,

          /*
           * Don't write metadata/thumbnail.
           */

          noWriteThumbnail: true,

          noWriteInfoJson: true,

          noWriteDescription: true,
        }
      );

    logger.info(
      `yt-dlp completed | requestId=${requestId}`
    );

    /*
     * Find generated file.
     */

    const files =
      await fs.promises.readdir(
        TEMP_DIR
      );

    const generatedFiles =
      files.filter((file) =>
        file.startsWith(
          `download-${requestId}.`
        )
      );

    if (
      generatedFiles.length === 0
    ) {
      logger.error(
        `Download completed but output file was not found | requestId=${requestId}`
      );

      return res.status(500).json({
        success: false,
        message:
          "Download failed because the generated file was not found.",
      });
    }

    /*
     * Prefer mp4.
     */

    const preferred =
      generatedFiles.find(
        (file) =>
          path.extname(file)
            .toLowerCase() === ".mp4"
      ) ||
      generatedFiles[0];

    outputFile =
      path.join(
        TEMP_DIR,
        preferred
      );

    const stats =
      await fs.promises.stat(
        outputFile
      );

    if (!stats.isFile()) {
      return res.status(500).json({
        success: false,
        message:
          "Generated download file is invalid.",
      });
    }

    if (stats.size <= 0) {
      return res.status(500).json({
        success: false,
        message:
          "Generated download file is empty.",
      });
    }

    const extension =
      path.extname(
        outputFile
      ).toLowerCase() || ".mp4";

    const title =
      cleanFileName(
        req.body?.title ||
          "download"
      );

    const finalName =
      `${title}${extension}`;

    logger.info(`
============================================================
TOOL DOWNLOAD SUCCESS
============================================================

Request ID:
${requestId}

File:
${outputFile}

Size:
${stats.size} bytes

Final Name:
${finalName}

============================================================
`);

    /*
     * Set headers BEFORE streaming.
     */

    res.status(200);

    res.setHeader(
      "Content-Type",
      extension === ".mp4"
        ? "video/mp4"
        : extension === ".webm"
        ? "video/webm"
        : extension === ".mp3"
        ? "audio/mpeg"
        : "application/octet-stream"
    );

    res.setHeader(
      "Content-Length",
      stats.size
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(
        finalName
      )}"`
    );

    res.setHeader(
      "Cache-Control",
      "no-store"
    );

    /*
     * Stream file instead of loading
     * the entire video into RAM.
     */

    const readStream =
      fs.createReadStream(
        outputFile
      );

    readStream.on(
      "error",
      async (streamError) => {
        logger.error(
          `Download stream error | requestId=${requestId} | ${streamError.message}`
        );

        await removeFile(
          outputFile
        );

        if (!res.headersSent) {
          return res.status(500).json({
            success: false,
            message:
              "Failed while streaming the downloaded file.",
          });
        }

        res.destroy(streamError);
      }
    );

    readStream.on(
      "close",
      async () => {
        await removeFile(
          outputFile
        );

        logger.info(
          `Temporary download file removed | requestId=${requestId}`
        );
      }
    );

    readStream.pipe(res);
  } catch (error) {
    const message =
      getYtDlpErrorMessage(error);

    logger.error(`
============================================================
TOOL DOWNLOAD ERROR
============================================================

Message:
${message}

Original Error:
${error?.message || "N/A"}

STDERR:
${error?.stderr || "N/A"}

STDOUT:
${error?.stdout || "N/A"}

Stack:
${error?.stack || "N/A"}

============================================================
`);

    if (outputFile) {
      await removeFile(
        outputFile
      );
    }

    if (res.headersSent) {
      return res.destroy(
        error
      );
    }

    return res.status(500).json({
      success: false,
      message,
    });
  }
};
