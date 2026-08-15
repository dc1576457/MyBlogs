import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import axios from "axios";
import * as cheerio from "cheerio";
import ytDlp from "youtube-dl-exec";
import { logger } from "../utils/logger.js";

const TEMP_DIR = path.join(os.tmpdir(), "myblog-tools");

const ensureTempDirectory = () => {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
};

const COMMON_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
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
  return String(name || "media")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
};

const removeFile = async (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (error) {
    logger?.warn?.(`Could not remove temp file: ${filePath}`);
  }
};

/* =========================================================
   NATIVE SCRAPERS (BYPASSES DATA-CENTER IP BLOCKS)
========================================================= */

// 1. Instagram Scraper
const scrapeInstagram = async (url) => {
  try {
    const cleanUrl = url.split("?")[0].replace(/\/+$/, "");
    const embedUrl = `${cleanUrl}/embed/captioned/`;

    const res = await axios.get(embedUrl, {
      headers: COMMON_HEADERS,
      timeout: 10000,
    });

    const $ = cheerio.load(res.data);
    const videoSrc = $("video").attr("src");
    const imageSrc = $("img.EmbeddedMediaImage").attr("src") || $('meta[property="og:image"]').attr("content");
    const caption = $("div.Caption").text().trim() || "Instagram Media";

    if (videoSrc) {
      return {
        title: caption.slice(0, 60) || "Instagram Video",
        thumbnail: imageSrc || null,
        isPhoto: false,
        formats: [
          {
            formatId: "ig-video",
            quality: "HD Video",
            height: 720,
            directUrl: videoSrc,
          },
        ],
      };
    }

    if (imageSrc) {
      return {
        title: caption.slice(0, 60) || "Instagram Photo",
        thumbnail: imageSrc,
        url: imageSrc,
        isPhoto: true,
        formats: [],
      };
    }
  } catch (err) {
    logger?.warn?.(`Instagram native scrape failed: ${err.message}`);
  }
  return null;
};

// 2. Pinterest Scraper
const scrapePinterest = async (url) => {
  try {
    let targetUrl = url;
    if (url.includes("pin.it")) {
      const redirectRes = await axios.get(url, {
        headers: COMMON_HEADERS,
        maxRedirects: 5,
        timeout: 10000,
      });
      targetUrl = redirectRes.request?.res?.responseUrl || url;
    }

    const res = await axios.get(targetUrl, {
      headers: COMMON_HEADERS,
      timeout: 10000,
    });

    const $ = cheerio.load(res.data);
    const ogVideo = $('meta[property="og:video"]').attr("content") || $('meta[name="og:video"]').attr("content");
    const ogImage = $('meta[property="og:image"]').attr("content") || $('meta[name="og:image"]').attr("content");
    const title = $('meta[property="og:title"]').attr("content") || "Pinterest Media";

    // Try finding embedded video tags or ld+json
    let directVideoUrl = ogVideo;
    if (!directVideoUrl) {
      const videoTag = $("video").attr("src");
      if (videoTag) directVideoUrl = videoTag;
    }

    if (directVideoUrl) {
      return {
        title: title.slice(0, 60),
        thumbnail: ogImage || null,
        isPhoto: false,
        formats: [
          {
            formatId: "pin-video",
            quality: "High Quality (HD)",
            height: 720,
            directUrl: directVideoUrl,
          },
        ],
      };
    }

    if (ogImage) {
      return {
        title: title.slice(0, 60),
        thumbnail: ogImage,
        url: ogImage,
        isPhoto: true,
        formats: [],
      };
    }
  } catch (err) {
    logger?.warn?.(`Pinterest native scrape failed: ${err.message}`);
  }
  return null;
};

// 3. Facebook Scraper
const scrapeFacebook = async (url) => {
  try {
    const res = await axios.get(url, {
      headers: {
        ...COMMON_HEADERS,
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Dest": "document",
      },
      timeout: 10000,
    });

    const html = res.data;
    const $ = cheerio.load(html);

    const ogVideo = $('meta[property="og:video"]').attr("content") || $('meta[property="og:video:secure_url"]').attr("content");
    const ogImage = $('meta[property="og:image"]').attr("content");
    const title = $('meta[property="og:title"]').attr("content") || "Facebook Video";

    // Extract HD/SD links from script tags if meta is not populated
    let hdUrl = null;
    let sdUrl = ogVideo || null;

    const hdMatch = html.match(/"browser_native_hd_url":"([^"]+)"/) || html.match(/"playable_url_quality_hd":"([^"]+)"/);
    const sdMatch = html.match(/"browser_native_sd_url":"([^"]+)"/) || html.match(/"playable_url":"([^"]+)"/);

    if (hdMatch && hdMatch[1]) hdUrl = JSON.parse(`"${hdMatch[1]}"`);
    if (sdMatch && sdMatch[1]) sdUrl = JSON.parse(`"${sdMatch[1]}"`);

    if (hdUrl || sdUrl) {
      const formats = [];
      if (hdUrl) {
        formats.push({
          formatId: "fb-hd",
          quality: "720p HD",
          height: 720,
          directUrl: hdUrl,
        });
      }
      if (sdUrl) {
        formats.push({
          formatId: "fb-sd",
          quality: "360p SD",
          height: 360,
          directUrl: sdUrl,
        });
      }

      return {
        title: title.slice(0, 60),
        thumbnail: ogImage || null,
        isPhoto: false,
        formats,
      };
    }
  } catch (err) {
    logger?.warn?.(`Facebook native scrape failed: ${err.message}`);
  }
  return null;
};

/* =========================================================
   EXTRACT TOOL
========================================================= */

export const extractTool = async (req, res) => {
  try {
    const { url } = req.body || {};

    if (!url || !validateUrl(url)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid URL.",
      });
    }

    const platform = getPlatform(url);
    if (platform === "unknown") {
      return res.status(400).json({
        success: false,
        message: "Unsupported platform URL.",
      });
    }

    logger?.info?.(`EXTRACT START: [${platform}] ${url}`);

    // STEP 1: Try Native Scrapers First (Fast & No Bot Blocking)
    let nativeResult = null;
    if (platform === "instagram") {
      nativeResult = await scrapeInstagram(url);
    } else if (platform === "pinterest") {
      nativeResult = await scrapePinterest(url);
    } else if (platform === "facebook") {
      nativeResult = await scrapeFacebook(url);
    }

    if (nativeResult) {
      return res.status(200).json({
        success: true,
        data: {
          id: crypto.randomBytes(6).toString("hex"),
          title: nativeResult.title,
          thumbnail: nativeResult.thumbnail,
          url: nativeResult.url || null,
          duration: 0,
          platform,
          isPhoto: Boolean(nativeResult.isPhoto),
          qualities: nativeResult.formats.map((f) => f.height).filter(Boolean),
          formats: nativeResult.formats,
        },
      });
    }

    // STEP 2: Advanced yt-dlp Fallback with Mobile Client Emulation
    const ytdlpArgs = {
      dumpSingleJson: true,
      noWarnings: true,
      noPlaylist: true,
      skipDownload: true,
      preferFreeFormats: true,
      noCheckCertificates: true,
      geoBypass: true,
      // Emulate iOS & Android apps to bypass data-center bot blocks
      extractorArgs: "youtube:player_client=ios,android,web_embedded;facebook:api=mobile",
      userAgent: COMMON_HEADERS["User-Agent"],
    };

    const result = await ytDlp(url, ytdlpArgs);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Could not extract media info.",
      });
    }

    const formats = Array.isArray(result.formats) ? result.formats : [];
    const isPhoto =
      result._type === "image" ||
      result.ext === "jpg" ||
      result.ext === "png" ||
      result.ext === "webp" ||
      (!formats.length && Boolean(result.thumbnail || result.url));

    const availableQualities = [
      ...new Set(
        formats
          .map((item) => Number(item.height))
          .filter((h) => Number.isFinite(h) && h > 0)
      ),
    ]
      .sort((a, b) => b - a)
      .slice(0, 8);

    return res.status(200).json({
      success: true,
      data: {
        id: result.id || crypto.randomBytes(6).toString("hex"),
        title: result.title || "Public Media",
        description: result.description || "",
        thumbnail: result.thumbnail || result.url || null,
        url: result.url || null,
        duration: result.duration || 0,
        uploader: result.uploader || result.channel || null,
        platform,
        isPhoto,
        qualities: availableQualities,
        formats: formats
          .filter(
            (item) => item && (item.vcodec !== "none" || item.acodec !== "none")
          )
          .map((item) => ({
            formatId: item.format_id || null,
            ext: item.ext || "mp4",
            quality: item.format_note || `${item.height || "Video"}p`,
            height: item.height || null,
            width: item.width || null,
            directUrl: item.url || null,
          }))
          .slice(0, 50),
      },
    });
  } catch (error) {
    logger?.error?.(`EXTRACT ERROR: ${error.message}`);
    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch media. Please make sure the post/video is publicly accessible.",
    });
  }
};

/* =========================================================
   DOWNLOAD TOOL
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
        message: "Valid media URL is required.",
      });
    }

    ensureTempDirectory();
    const requestId = crypto.randomBytes(8).toString("hex");
    const cleanBaseTitle = cleanFileName(title);

    // 1. High Speed Stream (Direct URL available)
    const targetDirectUrl = directUrl || (isPhoto ? sourceUrl : null);

    if (targetDirectUrl && validateUrl(targetDirectUrl)) {
      try {
        const streamRes = await axios({
          method: "GET",
          url: targetDirectUrl,
          responseType: "stream",
          timeout: 60000,
          headers: COMMON_HEADERS,
        });

        const contentType =
          streamRes.headers["content-type"] ||
          (isPhoto ? "image/jpeg" : "video/mp4");

        let ext = isPhoto ? ".jpg" : ".mp4";
        if (contentType.includes("png")) ext = ".png";
        if (contentType.includes("webp")) ext = ".webp";

        const finalName = `${cleanBaseTitle}${ext}`;

        res.status(200);
        res.setHeader("Content-Type", contentType);
        if (streamRes.headers["content-length"]) {
          res.setHeader("Content-Length", streamRes.headers["content-length"]);
        }
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${encodeURIComponent(finalName)}"`
        );
        res.setHeader("Cache-Control", "no-store");

        return streamRes.data.pipe(res);
      } catch (streamErr) {
        logger?.warn?.(`Direct stream fallback to yt-dlp: ${streamErr.message}`);
      }
    }

    // 2. yt-dlp Stream Download
    const baseFile = path.join(TEMP_DIR, `media-${requestId}`);
    let selectedFormat = "bestvideo+bestaudio/best";

    if (formatId) {
      selectedFormat = `${formatId}+bestaudio/${formatId}/best`;
    } else if (quality) {
      selectedFormat = `bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}]/best`;
    }

    await ytDlp(sourceUrl, {
      output: `${baseFile}.%(ext)s`,
      format: selectedFormat,
      noPlaylist: true,
      noWarnings: true,
      noCheckCertificates: true,
      mergeOutputFormat: "mp4",
      maxFilesize: "300M",
      retries: 3,
      extractorArgs: "youtube:player_client=ios,android,web_embedded",
      userAgent: COMMON_HEADERS["User-Agent"],
    });

    const files = await fs.promises.readdir(TEMP_DIR);
    const generatedFiles = files.filter((f) => f.startsWith(`media-${requestId}.`));

    if (generatedFiles.length === 0) {
      return res.status(500).json({
        success: false,
        message: "File processing failed.",
      });
    }

    const preferred =
      generatedFiles.find((f) => path.extname(f).toLowerCase() === ".mp4") ||
      generatedFiles[0];

    outputFile = path.join(TEMP_DIR, preferred);
    const stats = await fs.promises.stat(outputFile);
    const ext = path.extname(outputFile).toLowerCase() || ".mp4";
    const finalName = `${cleanBaseTitle}${ext}`;

    res.status(200);
    res.setHeader("Content-Type", ext === ".mp4" ? "video/mp4" : "application/octet-stream");
    res.setHeader("Content-Length", stats.size);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(finalName)}"`
    );
    res.setHeader("Cache-Control", "no-store");

    const readStream = fs.createReadStream(outputFile);
    readStream.on("close", async () => {
      await removeFile(outputFile);
    });
    readStream.on("error", async (err) => {
      await removeFile(outputFile);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: "Stream error." });
      }
    });

    readStream.pipe(res);
  } catch (error) {
    if (outputFile) await removeFile(outputFile);
    logger?.error?.(`DOWNLOAD ERROR: ${error.message}`);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to download media.",
      });
    }
  }
};
