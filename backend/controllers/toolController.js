import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import axios from "axios";
import * as cheerio from "cheerio";
import youtubedl from "youtube-dl-exec";

import { logger } from "../utils/logger.js";

/* =========================================================
   CONFIG
========================================================= */

const TEMP_DIR = path.join(os.tmpdir(), "myblog-tools");

const ensureTempDirectory = () => {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, {
      recursive: true,
    });
  }
};

ensureTempDirectory();

/* =========================================================
   BROWSER HEADERS
========================================================= */

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",

  "Accept-Language": "en-US,en;q=0.9",

  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",

  Connection: "keep-alive",
};

/* =========================================================
   URL VALIDATION
========================================================= */

const validateUrl = (value) => {
  if (!value || typeof value !== "string") {
    return false;
  }

  try {
    const parsed = new URL(value.trim());

    return (
      parsed.protocol === "http:" ||
      parsed.protocol === "https:"
    );
  } catch {
    return false;
  }
};

/* =========================================================
   PLATFORM DETECTION
========================================================= */

const getPlatform = (url) => {
  try {
    const hostname = new URL(url)
      .hostname
      .toLowerCase()
      .replace(/^www\./, "");

    /* =========================
       YOUTUBE
    ========================= */

    if (
      hostname === "youtube.com" ||
      hostname === "m.youtube.com" ||
      hostname === "youtu.be" ||
      hostname.endsWith(".youtube.com")
    ) {
      return "youtube";
    }

    /* =========================
       FACEBOOK
    ========================= */

    if (
      hostname === "facebook.com" ||
      hostname === "m.facebook.com" ||
      hostname === "fb.watch" ||
      hostname.endsWith(".facebook.com")
    ) {
      return "facebook";
    }

    /* =========================
       INSTAGRAM
    ========================= */

    if (
      hostname === "instagram.com" ||
      hostname === "m.instagram.com" ||
      hostname.endsWith(".instagram.com")
    ) {
      return "instagram";
    }

    /* =========================
       PINTEREST
    ========================= */

    if (
      hostname === "pinterest.com" ||
      hostname === "m.pinterest.com" ||
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
   YOUTUBE ID
========================================================= */

const extractYouTubeId = (url) => {
  try {
    const parsed = new URL(url);

    const hostname = parsed.hostname
      .toLowerCase()
      .replace(/^www\./, "");

    if (hostname === "youtu.be") {
      return (
        parsed.pathname
          .replace(/^\/+/, "")
          .split("/")[0] || null
      );
    }

    const videoId = parsed.searchParams.get("v");

    if (videoId) {
      return videoId;
    }

    const match = parsed.pathname.match(
      /\/(?:shorts|embed|v)\/([^/?&]+)/
    );

    return match?.[1] || null;
  } catch {
    return null;
  }
};

/* =========================================================
   CLEAN FILE NAME
========================================================= */

const cleanFileName = (name) => {
  return String(name || "download")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
};

/* =========================================================
   QUALITY NORMALIZER
   ONLY 360 + 720
========================================================= */

const normalizeQuality = (quality) => {
  const value = Number(quality);

  if (value === 360) {
    return 360;
  }

  return 720;
};

/* =========================================================
   SAFE URL DECODER
========================================================= */

const decodeMediaUrl = (value) => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(`"${value}"`);
  } catch {
    return String(value)
      .replace(/\\u0026/g, "&")
      .replace(/\\u003D/g, "=")
      .replace(/\\u002F/g, "/")
      .replace(/\\\//g, "/")
      .replace(/\\"/g, '"');
  }
};

/* =========================================================
   PINTEREST ENGINE
   DO NOT CHANGE
========================================================= */

const scrapePinterest = async (url) => {
  try {
    let targetUrl = url;

    /* Resolve pin.it */

    if (url.includes("pin.it")) {
      try {
        const redirectRes = await axios.get(url, {
          headers: BROWSER_HEADERS,
          maxRedirects: 5,
          timeout: 10000,
        });

        targetUrl =
          redirectRes.request?.res?.responseUrl ||
          redirectRes.config?.url ||
          url;
      } catch {
        // Continue
      }
    }

    const response = await axios.get(
      targetUrl,
      {
        headers: BROWSER_HEADERS,
        timeout: 15000,
        maxRedirects: 5,
      }
    );

    const html = response.data;
    const $ = cheerio.load(html);

    let title =
      $('meta[property="og:title"]').attr(
        "content"
      ) ||
      "Pinterest Media";

    let imageUrl =
      $('meta[property="og:image"]').attr(
        "content"
      ) || null;

    let videoUrl = null;

    /* =====================================================
       PINTEREST INTERNAL DATA
    ===================================================== */

    const pwsData =
      $("#__PWS_DATA__").html();

    if (pwsData) {
      try {
        const json = JSON.parse(pwsData);

        const pins =
          json?.props?.initialReduxState
            ?.pins || {};

        const pinKeys =
          Object.keys(pins);

        const pinObj =
          pins[pinKeys[0]];

        if (pinObj) {
          title =
            pinObj.title ||
            pinObj.grid_title ||
            pinObj.description ||
            title;

          imageUrl =
            pinObj.images?.orig?.url ||
            pinObj.images?.["736x"]?.url ||
            imageUrl;

          const videos =
            pinObj.videos?.video_list;

          if (videos) {
            const videoItems =
              Object.values(videos);

            videoUrl =
              videos.V_720P?.url ||
              videos.V_HLSV4?.url ||
              videos.V_EXP3?.url ||
              videoItems.find(
                (item) => item?.url
              )?.url ||
              null;
          }
        }
      } catch {
        // Ignore
      }
    }

    /* =====================================================
       SEARCH MP4
    ===================================================== */

    if (!videoUrl) {
      const matches = html.match(
        /https:\/\/[^"'\s]+\.pinimg\.com\/videos\/[^"'\s]+\.mp4/g
      );

      if (matches?.length) {
        videoUrl =
          matches.find(
            (item) =>
              item.includes("720p") ||
              item.includes("V_720P")
          ) ||
          matches[0];
      }
    }

    /* =====================================================
       VIDEO
    ===================================================== */

    if (
      videoUrl &&
      validateUrl(videoUrl)
    ) {
      return {
        title: cleanFileName(title),
        thumbnail: imageUrl,
        isPhoto: false,

        formats: [
          {
            formatId: "pinterest-720",
            quality: "720p HD",
            height: 720,
            directUrl: videoUrl,
          },
        ],
      };
    }

    /* =====================================================
       PHOTO
    ===================================================== */

    if (
      imageUrl &&
      validateUrl(imageUrl)
    ) {
      return {
        title: cleanFileName(title),
        thumbnail: imageUrl,
        url: imageUrl,
        isPhoto: true,
        formats: [],
      };
    }

    return null;
  } catch (error) {
    logger?.warn?.(
      `Pinterest scraper error: ${error.message}`
    );

    return null;
  }
};

/* =========================================================
   INSTAGRAM ENGINE
   NEW PUBLIC MEDIA ENGINE
========================================================= */

const getInstagramType = (url) => {
  const pathname = new URL(url).pathname.toLowerCase();

  if (pathname.startsWith("/reel/")) {
    return "reel";
  }

  if (pathname.startsWith("/reels/")) {
    return "reel";
  }

  if (pathname.startsWith("/p/")) {
    return "post";
  }

  if (pathname.startsWith("/tv/")) {
    return "video";
  }

  return "unknown";
};

/* =========================================================
   RUN YT-DLP JSON
========================================================= */

const runYtDlpJson = async (url) => {
  const result = await youtubedl(url, {
    dumpSingleJson: true,
    noDownload: true,
    noPlaylist: true,
    noWarnings: true,
    noCheckCertificates: true,
    skipDownload: true,
    quiet: true,
    retries: 2,
    fragmentRetries: 2,
  });

  return result;
};

/* =========================================================
   GET BEST INSTAGRAM FORMAT
========================================================= */

const buildInstagramFormats = (data) => {
  const formats = Array.isArray(data?.formats)
    ? data.formats
    : [];

  const result = [];

  const videoFormats = formats
    .filter((format) => {
      const height = Number(format?.height);

      return (
        format?.url &&
        Number.isFinite(height) &&
        height > 0 &&
        (
          format?.vcodec !== "none" ||
          format?.ext === "mp4"
        )
      );
    })
    .sort(
      (a, b) =>
        Number(a.height || 0) -
        Number(b.height || 0)
    );

  const addBestAtOrBelow = (target) => {
    const candidates = videoFormats.filter(
      (format) =>
        Number(format.height) <= target
    );

    if (!candidates.length) {
      return;
    }

    const selected =
      candidates[candidates.length - 1];

    result.push({
      formatId:
        selected.format_id ||
        `instagram-${target}`,

      quality:
        `${Number(selected.height)}p`,

      height:
        Number(selected.height),

      directUrl:
        selected.url,
    });
  };

  addBestAtOrBelow(360);
  addBestAtOrBelow(720);

  /* Remove duplicate heights */

  return result.filter(
    (format, index, array) =>
      array.findIndex(
        (item) =>
          Number(item.height) ===
          Number(format.height)
      ) === index
  );
};

/* =========================================================
   INSTAGRAM PUBLIC EXTRACT
========================================================= */

const scrapeInstagram = async (url) => {
  try {
    const type = getInstagramType(url);

    /*
     * We intentionally allow public:
     *
     * /p/
     * /reel/
     * /reels/
     * /tv/
     *
     * Private/unavailable media will fail in yt-dlp.
     */

    if (
      !["post", "reel", "video"].includes(type)
    ) {
      return null;
    }

    const data =
      await runYtDlpJson(url);

    if (!data) {
      return null;
    }

    const title =
      cleanFileName(
        data.title ||
        data.description ||
        "Instagram Media"
      );

    const thumbnail =
      data.thumbnail || null;

    const formats =
      buildInstagramFormats(data);

    /*
     * VIDEO
     */

    if (formats.length > 0) {
      return {
        title,
        thumbnail,
        uploader:
          data.uploader ||
          data.channel ||
          null,

        isPhoto: false,

        formats,
      };
    }

    /*
     * PHOTO
     */

    const imageUrl =
      data.thumbnail ||
      data.url ||
      null;

    if (
      imageUrl &&
      validateUrl(imageUrl)
    ) {
      return {
        title,
        thumbnail: imageUrl,
        url: imageUrl,
        uploader:
          data.uploader ||
          data.channel ||
          null,

        isPhoto: true,

        formats: [],
      };
    }

    return null;
  } catch (error) {
    logger?.warn?.(
      `Instagram yt-dlp error: ${error.message}`
    );

    return null;
  }
};

/* =========================================================
   FACEBOOK ENGINE
   DO NOT CHANGE
========================================================= */

const scrapeFacebook = async (url) => {
  try {
    const response =
      await axios.get(url, {
        headers: {
          ...BROWSER_HEADERS,

          "Sec-Fetch-Site":
            "none",

          "Sec-Fetch-Mode":
            "navigate",

          "Sec-Fetch-Dest":
            "document",
        },

        timeout: 15000,
        maxRedirects: 5,
      });

    const html = response.data;

    const $ =
      cheerio.load(html);

    let hdUrl = null;
    let sdUrl = null;

    const title =
      $('meta[property="og:title"]')
        .attr("content") ||
      "Facebook Video";

    const thumbnail =
      $('meta[property="og:image"]')
        .attr("content") ||
      null;

    /* =====================================================
       HD
    ===================================================== */

    const hdMatch =
      html.match(
        /"browser_native_hd_url":"([^"]+)"/
      ) ||
      html.match(
        /"playable_url_quality_hd":"([^"]+)"/
      );

    /* =====================================================
       SD
    ===================================================== */

    const sdMatch =
      html.match(
        /"browser_native_sd_url":"([^"]+)"/
      ) ||
      html.match(
        /"playable_url":"([^"]+)"/
      );

    if (hdMatch?.[1]) {
      hdUrl =
        decodeMediaUrl(
          hdMatch[1]
        );
    }

    if (sdMatch?.[1]) {
      sdUrl =
        decodeMediaUrl(
          sdMatch[1]
        );
    }

    if (!sdUrl) {
      sdUrl =
        $('meta[property="og:video"]')
          .attr("content") ||
        $('meta[property="og:video:secure_url"]')
          .attr("content") ||
        null;
    }

    const formats = [];

    /* =====================================================
       720
    ===================================================== */

    if (
      hdUrl &&
      validateUrl(hdUrl)
    ) {
      formats.push({
        formatId: "facebook-720",
        quality: "720p HD",
        height: 720,
        directUrl: hdUrl,
      });
    }

    /* =====================================================
       360
    ===================================================== */

    if (
      sdUrl &&
      validateUrl(sdUrl)
    ) {
      formats.push({
        formatId: "facebook-360",
        quality: "360p SD",
        height: 360,
        directUrl: sdUrl,
      });
    }

    if (formats.length) {
      return {
        title: cleanFileName(title),
        thumbnail,
        isPhoto: false,
        formats,
      };
    }

    return null;
  } catch (error) {
    logger?.warn?.(
      `Facebook scraper error: ${error.message}`
    );

    return null;
  }
};

/* =========================================================
   YOUTUBE PUBLIC EXTRACTION
========================================================= */

const buildYouTubeFormats = (data) => {
  const formats = Array.isArray(data?.formats)
    ? data.formats
    : [];

  const result = [];

  const videoFormats = formats
    .filter((format) => {
      const height = Number(format?.height);

      return (
        format?.url &&
        Number.isFinite(height) &&
        height > 0 &&
        format?.vcodec !== "none"
      );
    })
    .sort(
      (a, b) =>
        Number(a.height || 0) -
        Number(b.height || 0)
    );

  const getFormat = (target) => {
    const candidates =
      videoFormats.filter(
        (format) =>
          Number(format.height) <= target
      );

    if (!candidates.length) {
      return null;
    }

    return candidates[candidates.length - 1];
  };

  for (const target of [360, 720]) {
    const format =
      getFormat(target);

    if (!format) {
      continue;
    }

    result.push({
      formatId:
        format.format_id ||
        `youtube-${target}`,

      quality:
        `${Number(format.height)}p`,

      height:
        Number(format.height),

      directUrl:
        format.url,
    });
  }

  return result.filter(
    (format, index, array) =>
      array.findIndex(
        (item) =>
          Number(item.height) ===
          Number(format.height)
      ) === index
  );
};

/* =========================================================
   YOUTUBE ENGINE
========================================================= */

const scrapeYouTube = async (url) => {
  try {
    const videoId =
      extractYouTubeId(url);

    if (!videoId) {
      return null;
    }

    /*
     * IMPORTANT:
     * Actually inspect the video.
     *
     * This prevents the old behaviour where
     * every YouTube URL was marked successful
     * even when yt-dlp could not access it.
     */

    const data =
      await runYtDlpJson(url);

    if (!data) {
      return null;
    }

    /*
     * Private / unavailable / restricted
     */

    if (
      data.is_live &&
      !data.formats?.length
    ) {
      return null;
    }

    const formats =
      buildYouTubeFormats(data);

    /*
     * Fallback thumbnail
     */

    const thumbnail =
      data.thumbnail ||
      `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    /*
     * If yt-dlp has no usable video format,
     * extraction should fail.
     */

    if (!formats.length) {
      return null;
    }

    return {
      title: cleanFileName(
        data.title ||
        "YouTube Video"
      ),

      thumbnail,

      uploader:
        data.uploader ||
        data.channel ||
        "YouTube Creator",

      duration:
        Number(data.duration) || 0,

      isPhoto: false,

      formats,
    };
  } catch (error) {
    logger?.warn?.(
      `YouTube extraction error: ${error.message}`
    );

    return null;
  }
};

/* =========================================================
   EXTRACT CONTROLLER
========================================================= */

export const extractTool = async (
  req,
  res
) => {
  try {
    const {
      url,
      tool,
    } = req.body || {};

    if (
      !url ||
      !validateUrl(url)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter a valid URL.",
      });
    }

    const cleanUrl =
      url.trim();

    const platform =
      getPlatform(cleanUrl);

    if (
      platform === "unknown"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Unsupported platform URL.",
      });
    }

    /* =====================================================
       TOOL VALIDATION
    ===================================================== */

    if (
      tool &&
      typeof tool === "string" &&
      !tool.toLowerCase().includes(
        platform
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Please enter a valid ${platform} URL.`,
      });
    }

    let parsedData = null;

    /* =====================================================
       PLATFORM ENGINE
    ===================================================== */

    if (platform === "youtube") {
      parsedData =
        await scrapeYouTube(
          cleanUrl
        );
    }

    /*
     * FACEBOOK UNCHANGED
     */

    if (platform === "facebook") {
      parsedData =
        await scrapeFacebook(
          cleanUrl
        );
    }

    /*
     * INSTAGRAM NEW PUBLIC ENGINE
     */

    if (platform === "instagram") {
      parsedData =
        await scrapeInstagram(
          cleanUrl
        );
    }

    /*
     * PINTEREST UNCHANGED
     */

    if (platform === "pinterest") {
      parsedData =
        await scrapePinterest(
          cleanUrl
        );
    }

    /* =====================================================
       SUCCESS
    ===================================================== */

    if (parsedData) {
      return res.status(200).json({
        success: true,

        data: {
          id: crypto
            .randomBytes(6)
            .toString("hex"),

          title:
            parsedData.title ||
            `${platform.toUpperCase()} Media`,

          thumbnail:
            parsedData.thumbnail ||
            null,

          url:
            parsedData.url ||
            cleanUrl,

          duration:
            parsedData.duration || 0,

          uploader:
            parsedData.uploader ||
            null,

          platform,

          isPhoto:
            Boolean(
              parsedData.isPhoto
            ),

          qualities:
            parsedData.formats
              ?.map(
                (format) =>
                  Number(format.height)
              )
              .filter(Boolean) ||
            [],

          formats:
            parsedData.formats ||
            [],
        },
      });
    }

    return res.status(422).json({
      success: false,
      message:
        `Unable to extract ${platform} media. ` +
        "The media may be private, unavailable, restricted, or protected.",
    });
  } catch (error) {
    logger?.error?.(
      `Extract global error: ${error.message}`
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to extract media information.",
    });
  }
};

/* =========================================================
   YOUTUBE / INSTAGRAM YT-DLP DOWNLOAD
========================================================= */

const downloadWithYtDlp = async ({
  url,
  quality,
  title,
  platform,
}) => {
  ensureTempDirectory();

  const id =
    crypto
      .randomBytes(12)
      .toString("hex");

  const outputPath =
    path.join(
      TEMP_DIR,
      `${id}.mp4`
    );

  const normalizedQuality =
    normalizeQuality(
      quality
    );

  /*
   * 360:
   * video <=360 + audio
   *
   * 720:
   * video <=720 + audio
   *
   * fallback to progressive MP4
   */

  const format =
    normalizedQuality === 360
      ? "bestvideo[height<=360]+bestaudio/best[height<=360]/best[ext=mp4][height<=360]"
      : "bestvideo[height<=720]+bestaudio/best[height<=720]/best[ext=mp4][height<=720]";

  try {
    await youtubedl(
      url,
      {
        output:
          outputPath,

        format,

        mergeOutputFormat:
          "mp4",

        noPlaylist: true,

        noWarnings: true,

        noCheckCertificates:
          true,

        restrictFilenames:
          true,

        retries: 3,

        fragmentRetries: 3,

        concurrentFragments: 4,

        quiet: true,
      }
    );

    if (
      !fs.existsSync(
        outputPath
      )
    ) {
      throw new Error(
        `${platform} downloader did not create the output file.`
      );
    }

    const stats =
      await fs.promises.stat(
        outputPath
      );

    if (!stats.size) {
      throw new Error(
        `Downloaded ${platform} file is empty.`
      );
    }

    return {
      outputPath,

      size:
        stats.size,

      quality:
        normalizedQuality,

      filename:
        `${cleanFileName(
          title ||
            `${platform}-video`
        )}.mp4`,
    };
  } catch (error) {
    try {
      if (
        fs.existsSync(
          outputPath
        )
      ) {
        await fs.promises.unlink(
          outputPath
        );
      }
    } catch {
      // Ignore
    }

    throw error;
  }
};

/* =========================================================
   STREAM LOCAL FILE
========================================================= */

const streamLocalFile = async (
  res,
  filePath,
  filename,
  contentType
) => {
  try {
    const stats =
      await fs.promises.stat(
        filePath
      );

    res.status(200);

    res.setHeader(
      "Content-Type",
      contentType
    );

    res.setHeader(
      "Content-Length",
      stats.size
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(
        filename
      )}"`
    );

    res.setHeader(
      "Cache-Control",
      "no-store"
    );

    const stream =
      fs.createReadStream(
        filePath
      );

    stream.on(
      "error",
      async (error) => {
        logger?.error?.(
          `File stream error: ${error.message}`
        );

        try {
          if (
            fs.existsSync(
              filePath
            )
          ) {
            await fs.promises.unlink(
              filePath
            );
          }
        } catch {
          // Ignore
        }

        if (
          !res.headersSent
        ) {
          res.status(500).json({
            success: false,
            message:
              "Unable to stream downloaded file.",
          });
        }
      }
    );

    stream.on(
      "close",
      async () => {
        try {
          if (
            fs.existsSync(
              filePath
            )
          ) {
            await fs.promises.unlink(
              filePath
            );
          }
        } catch {
          // Ignore
        }
      }
    );

    stream.pipe(res);
  } catch (error) {
    try {
      if (
        fs.existsSync(
          filePath
        )
      ) {
        await fs.promises.unlink(
          filePath
        );
      }
    } catch {
      // Ignore
    }

    throw error;
  }
};

/* =========================================================
   MEDIA EXTENSION
========================================================= */

const getMediaExtension = (
  contentType,
  isPhoto
) => {
  const type =
    String(
      contentType || ""
    ).toLowerCase();

  if (type.includes("png")) {
    return ".png";
  }

  if (type.includes("webp")) {
    return ".webp";
  }

  if (type.includes("gif")) {
    return ".gif";
  }

  if (
    type.includes("jpeg") ||
    type.includes("jpg")
  ) {
    return ".jpg";
  }

  if (type.includes("webm")) {
    return ".webm";
  }

  if (type.includes("mkv")) {
    return ".mkv";
  }

  return isPhoto
    ? ".jpg"
    : ".mp4";
};

/* =========================================================
   DIRECT MEDIA STREAM
========================================================= */

const streamDirectMedia = async ({
  res,
  directUrl,
  filename,
  isPhoto = false,
}) => {
  if (
    !directUrl ||
    !validateUrl(directUrl)
  ) {
    throw new Error(
      "Direct media URL is invalid."
    );
  }

  const response =
    await axios({
      method: "GET",

      url: directUrl,

      responseType: "stream",

      timeout: 120000,

      maxRedirects: 5,

      headers:
        BROWSER_HEADERS,

      validateStatus:
        (status) =>
          status >= 200 &&
          status < 300,
    });

  const contentType =
    response.headers[
      "content-type"
    ] ||
    (isPhoto
      ? "image/jpeg"
      : "video/mp4");

  /*
   * NEVER DOWNLOAD HTML
   */

  if (
    contentType
      .toLowerCase()
      .includes("text/html")
  ) {
    response.data.destroy();

    throw new Error(
      "The supplied URL returned a webpage instead of media."
    );
  }

  const extension =
    getMediaExtension(
      contentType,
      isPhoto
    );

  const finalFilename =
    filename.endsWith(
      extension
    )
      ? filename
      : `${filename}${extension}`;

  res.status(200);

  res.setHeader(
    "Content-Type",
    contentType
  );

  if (
    response.headers[
      "content-length"
    ]
  ) {
    res.setHeader(
      "Content-Length",
      response.headers[
        "content-length"
      ]
    );
  }

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${encodeURIComponent(
      finalFilename
    )}"`
  );

  res.setHeader(
    "Cache-Control",
    "no-store"
  );

  response.data.on(
    "error",
    (error) => {
      logger?.error?.(
        `Direct media stream error: ${error.message}`
      );
    }
  );

  return response.data.pipe(
    res
  );
};

/* =========================================================
   SELECT FORMAT
========================================================= */

const getSelectedFormat = (
  formats = [],
  quality
) => {
  const normalized =
    normalizeQuality(
      quality
    );

  const validFormats =
    formats.filter(
      (format) =>
        validateUrl(
          format?.directUrl
        )
    );

  const exact =
    validFormats.find(
      (format) =>
        Number(
          format.height
        ) === normalized
    );

  if (exact) {
    return exact;
  }

  const lower =
    validFormats
      .filter(
        (format) =>
          Number(
            format.height
          ) <= normalized
      )
      .sort(
        (a, b) =>
          Number(b.height) -
          Number(a.height)
      );

  if (lower.length) {
    return lower[0];
  }

  return validFormats[0];
};

/* =========================================================
   DOWNLOAD CONTROLLER
========================================================= */

export const downloadTool =
  async (
    req,
    res
  ) => {
    try {
      const {
        url,
        quality,
        isPhoto,
        directUrl,
        title,
        formats,
      } = req.body || {};

      const sourceUrl =
        typeof url === "string"
          ? url.trim()
          : "";

      if (
        !sourceUrl ||
        !validateUrl(
          sourceUrl
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Valid media URL is required.",
        });
      }

      const platform =
        getPlatform(
          sourceUrl
        );

      if (
        platform === "unknown"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Unsupported media platform.",
        });
      }

      const normalizedQuality =
        normalizeQuality(
          quality
        );

      const cleanTitle =
        cleanFileName(
          title ||
            `${platform}-media`
        );

      /* =====================================================
         YOUTUBE
      ===================================================== */

      if (
        platform === "youtube"
      ) {
        try {
          const result =
            await downloadWithYtDlp({
              url: sourceUrl,

              quality:
                normalizedQuality,

              title:
                cleanTitle,

              platform:
                "YouTube",
            });

          return await streamLocalFile(
            res,

            result.outputPath,

            result.filename,

            "video/mp4"
          );
        } catch (error) {
          logger?.error?.(
            `YouTube download error: ${error.message}`
          );

          return res.status(422).json({
            success: false,

            message:
              "YouTube video could not be downloaded. Please make sure the video is public and try again.",
          });
        }
      }

      /* =====================================================
         INSTAGRAM
         USE YT-DLP FOR PUBLIC MEDIA
      ===================================================== */

      if (
        platform === "instagram"
      ) {
        try {
          /*
           * First attempt the direct format
           * received from extraction.
           */

          if (
            directUrl &&
            validateUrl(
              directUrl
            )
          ) {
            try {
              return await streamDirectMedia({
                res,

                directUrl,

                filename:
                  cleanTitle,

                isPhoto:
                  Boolean(
                    isPhoto
                  ),
              });
            } catch (error) {
              logger?.warn?.(
                `Instagram direct URL failed: ${error.message}`
              );
            }
          }

          /*
           * If direct URL expired/failed,
           * extract and download again.
           */

          const mediaData =
            await scrapeInstagram(
              sourceUrl
            );

          if (!mediaData) {
            return res.status(422).json({
              success: false,
              message:
                "Instagram media could not be accessed. The post may be private, unavailable, or protected.",
            });
          }

          /*
           * PHOTO
           */

          if (
            mediaData.isPhoto
          ) {
            const photoUrl =
              mediaData.url ||
              mediaData.thumbnail;

            if (
              photoUrl &&
              validateUrl(
                photoUrl
              )
            ) {
              return await streamDirectMedia({
                res,

                directUrl:
                  photoUrl,

                filename:
                  cleanTitle,

                isPhoto: true,
              });
            }
          }

          /*
           * VIDEO
           */

          const selected =
            getSelectedFormat(
              mediaData.formats ||
                [],
              normalizedQuality
            );

          if (
            selected?.directUrl &&
            validateUrl(
              selected.directUrl
            )
          ) {
            try {
              return await streamDirectMedia({
                res,

                directUrl:
                  selected.directUrl,

                filename:
                  cleanTitle,

                isPhoto: false,
              });
            } catch {
              // Fallback to yt-dlp
            }
          }

          /*
           * Final fallback
           */

          const result =
            await downloadWithYtDlp({
              url: sourceUrl,

              quality:
                normalizedQuality,

              title:
                cleanTitle,

              platform:
                "Instagram",
            });

          return await streamLocalFile(
            res,

            result.outputPath,

            result.filename,

            "video/mp4"
          );
        } catch (error) {
          logger?.error?.(
            `Instagram download error: ${error.message}`
          );

          return res.status(422).json({
            success: false,

            message:
              "Instagram media could not be downloaded. Make sure the post is public and try again.",
          });
        }
      }

      /* =====================================================
         FACEBOOK
         EXISTING FLOW
      ===================================================== */

      let selectedDirectUrl =
        directUrl;

      let selectedIsPhoto =
        Boolean(isPhoto);

      /*
       * Frontend direct URL
       */

      if (
        selectedDirectUrl &&
        validateUrl(
          selectedDirectUrl
        )
      ) {
        try {
          return await streamDirectMedia({
            res,

            directUrl:
              selectedDirectUrl,

            filename:
              cleanTitle,

            isPhoto:
              selectedIsPhoto,
          });
        } catch (error) {
          logger?.warn?.(
            `Frontend direct media failed: ${error.message}`
          );
        }
      }

      /* =====================================================
         RE-EXTRACT
      ===================================================== */

      let mediaData = null;

      if (
        platform === "facebook"
      ) {
        mediaData =
          await scrapeFacebook(
            sourceUrl
          );
      }

      if (
        platform === "pinterest"
      ) {
        mediaData =
          await scrapePinterest(
            sourceUrl
          );
      }

      if (!mediaData) {
        return res.status(422).json({
          success: false,

          message:
            `${platform} media could not be extracted. ` +
            "The media may be private, unavailable, or protected.",
        });
      }

      selectedIsPhoto =
        Boolean(
          mediaData.isPhoto
        );

      /* =====================================================
         PHOTO
      ===================================================== */

      if (
        selectedIsPhoto &&
        mediaData.url &&
        validateUrl(
          mediaData.url
        )
      ) {
        try {
          return await streamDirectMedia({
            res,

            directUrl:
              mediaData.url,

            filename:
              cleanTitle,

            isPhoto: true,
          });
        } catch (error) {
          logger?.error?.(
            `Photo download error: ${error.message}`
          );
        }
      }

      /* =====================================================
         VIDEO FORMAT
      ===================================================== */

      let selectedFormat =
        null;

      if (
        Array.isArray(
          formats
        ) &&
        formats.length
      ) {
        selectedFormat =
          getSelectedFormat(
            formats,
            normalizedQuality
          );
      }

      if (
        !selectedFormat
      ) {
        selectedFormat =
          getSelectedFormat(
            mediaData.formats ||
              [],
            normalizedQuality
          );
      }

      if (
        selectedFormat?.directUrl &&
        validateUrl(
          selectedFormat.directUrl
        )
      ) {
        try {
          return await streamDirectMedia({
            res,

            directUrl:
              selectedFormat.directUrl,

            filename:
              cleanTitle,

            isPhoto: false,
          });
        } catch (error) {
          logger?.error?.(
            `${platform} video download error: ${error.message}`
          );
        }
      }

      return res.status(422).json({
        success: false,

        message:
          `${platform} direct video file could not be found. ` +
          "The supplied page does not contain an accessible video file.",
      });
    } catch (error) {
      logger?.error?.(
        `DOWNLOAD GLOBAL ERROR: ${error.message}`
      );

      if (
        res.headersSent
      ) {
        return;
      }

      return res.status(500).json({
        success: false,

        message:
          "Failed to download media. Please try again.",
      });
    }
  };
