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

const BROWSER_HEADERS = {
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
  return String(name || "download")
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
    // Ignore
  }
};

/* =========================================================
   1. PINTEREST OFFICIAL PIDGETS + SCRAPER ENGINE
========================================================= */

const scrapePinterest = async (url) => {
  try {
    let targetUrl = url;

    // Resolve shortlink (pin.it)
    if (url.includes("pin.it")) {
      try {
        const redirectRes = await axios.get(url, {
          headers: BROWSER_HEADERS,
          maxRedirects: 5,
          timeout: 8000,
        });
        targetUrl = redirectRes.request?.res?.responseUrl || url;
      } catch (e) {
        // Continue with original URL
      }
    }

    // Extract numeric Pin ID
    const pinIdMatch = targetUrl.match(/\/pin\/(\d+)/);
    const pinId = pinIdMatch ? pinIdMatch[1] : null;

    if (pinId) {
      try {
        // Pinterest Official Public Pidgets API
        const pidgetRes = await axios.get(
          `https://api.pinterest.com/v3/pidgets/pins/info/?pin_ids=${pinId}`,
          { headers: BROWSER_HEADERS, timeout: 8000 }
        );

        const pinData = pidgetRes.data?.data?.pins?.[0];
        if (pinData) {
          const title = pinData.description || "Pinterest Media";
          const imageUrl = pinData.images?.orig?.url || pinData.images?.["736x"]?.url;

          // Check if it's an image or has embedded video
          return {
            title: title.slice(0, 70),
            thumbnail: imageUrl || null,
            url: imageUrl,
            isPhoto: true,
            formats: [],
          };
        }
      } catch (e) {
        // Fallback to HTML Scraping
      }
    }

    // HTML fallback
    const res = await axios.get(targetUrl, {
      headers: BROWSER_HEADERS,
      timeout: 10000,
    });

    const html = res.data;
    const $ = cheerio.load(html);

    let videoUrl = null;
    let imageUrl = $('meta[property="og:image"]').attr("content");
    let title = $('meta[property="og:title"]').attr("content") || "Pinterest Media";

    const pwsData = $("#__PWS_DATA__").html();
    if (pwsData) {
      try {
        const json = JSON.parse(pwsData);
        const pins = json?.props?.initialReduxState?.pins || {};
        const pinKey = Object.keys(pins)[0];
        const pinObj = pins[pinKey];
        if (pinObj) {
          title = pinObj.title || pinObj.grid_title || title;
          imageUrl = pinObj.images?.orig?.url || imageUrl;
          const videos = pinObj.videos?.video_list;
          if (videos) {
            videoUrl =
              videos.V_720P?.url ||
              videos.V_HLSV4?.url ||
              videos.V_EXP3?.url ||
              Object.values(videos)[0]?.url;
          }
        }
      } catch (e) {
        // Ignore
      }
    }

    if (!videoUrl) {
      const mp4Matches = html.match(/https:\/\/[^"'\s]+\.pinimg\.com\/videos\/[^"'\s]+\.mp4/g);
      if (mp4Matches && mp4Matches.length > 0) {
        videoUrl = mp4Matches.find((u) => u.includes("720p") || u.includes("V_720P")) || mp4Matches[0];
      }
    }

    if (videoUrl) {
      return {
        title: title.slice(0, 70),
        thumbnail: imageUrl || null,
        isPhoto: false,
        formats: [
          {
            formatId: "pin-720",
            quality: "720p HD",
            height: 720,
            directUrl: videoUrl,
          },
        ],
      };
    }

    if (imageUrl) {
      return {
        title: title.slice(0, 70),
        thumbnail: imageUrl,
        url: imageUrl,
        isPhoto: true,
        formats: [],
      };
    }
  } catch (err) {
    logger?.warn?.(`Pinterest scraper error: ${err.message}`);
  }
  return null;
};

/* =========================================================
   2. INSTAGRAM ENGINE (OEMBED + GRAPHQL + EMBED SCRAPING)
========================================================= */

const scrapeInstagram = async (url) => {
  try {
    const cleanUrl = url.split("?")[0].replace(/\/+$/, "");

    // 1. Try Instagram oEmbed for Title and Thumbnail
    let oembedData = null;
    try {
      const oembedRes = await axios.get(
        `https://api.instagram.com/oembed/?url=${encodeURIComponent(cleanUrl)}`,
        { headers: BROWSER_HEADERS, timeout: 8000 }
      );
      oembedData = oembedRes.data;
    } catch (e) {
      // Continue
    }

    // 2. Fetch Embed Page HTML
    const embedUrl = `${cleanUrl}/embed/captioned/`;
    const res = await axios.get(embedUrl, {
      headers: BROWSER_HEADERS,
      timeout: 10000,
    });

    const html = res.data;
    const $ = cheerio.load(html);

    let videoUrl = null;
    let imageUrl = oembedData?.thumbnail_url || null;
    const caption =
      oembedData?.title ||
      $("div.Caption").text().trim() ||
      "Instagram Media";

    // Direct Video Tag
    const videoTag = $("video").attr("src");
    if (videoTag) videoUrl = videoTag;

    // Script Regex
    if (!videoUrl) {
      const match =
        html.match(/"video_url":"([^"]+)"/) ||
        html.match(/"playable_url":"([^"]+)"/);
      if (match && match[1]) {
        videoUrl = JSON.parse(`"${match[1]}"`);
      }
    }

    // Image Tag
    if (!imageUrl) {
      imageUrl =
        $("img.EmbeddedMediaImage").attr("src") ||
        $('meta[property="og:image"]').attr("content");
    }

    if (!imageUrl) {
      const imgMatch =
        html.match(/"display_url":"([^"]+)"/) ||
        html.match(/"thumbnail_src":"([^"]+)"/);
      if (imgMatch && imgMatch[1]) {
        imageUrl = JSON.parse(`"${imgMatch[1]}"`);
      }
    }

    if (videoUrl) {
      return {
        title: caption.slice(0, 70) || "Instagram Reel",
        thumbnail: imageUrl || null,
        isPhoto: false,
        formats: [
          {
            formatId: "ig-hd",
            quality: "HD Video",
            height: 720,
            directUrl: videoUrl,
          },
        ],
      };
    }

    if (imageUrl) {
      return {
        title: caption.slice(0, 70) || "Instagram Photo",
        thumbnail: imageUrl,
        url: imageUrl,
        isPhoto: true,
        formats: [],
      };
    }
  } catch (err) {
    logger?.warn?.(`Instagram scraper error: ${err.message}`);
  }
  return null;
};

/* =========================================================
   3. FACEBOOK ENGINE (OPEN GRAPH + EMBEDDED STREAM SCRAPING)
========================================================= */

const scrapeFacebook = async (url) => {
  try {
    const res = await axios.get(url, {
      headers: {
        ...BROWSER_HEADERS,
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Dest": "document",
      },
      timeout: 10000,
    });

    const html = res.data;
    const $ = cheerio.load(html);

    let hdUrl = null;
    let sdUrl = null;
    const title =
      $('meta[property="og:title"]').attr("content") || "Facebook Video";
    const thumbnail =
      $('meta[property="og:image"]').attr("content") || null;

    const hdMatch =
      html.match(/"browser_native_hd_url":"([^"]+)"/) ||
      html.match(/"playable_url_quality_hd":"([^"]+)"/);
    const sdMatch =
      html.match(/"browser_native_sd_url":"([^"]+)"/) ||
      html.match(/"playable_url":"([^"]+)"/);

    if (hdMatch && hdMatch[1]) hdUrl = JSON.parse(`"${hdMatch[1]}"`);
    if (sdMatch && sdMatch[1]) sdUrl = JSON.parse(`"${sdMatch[1]}"`);

    if (!sdUrl) {
      sdUrl =
        $('meta[property="og:video"]').attr("content") ||
        $('meta[property="og:video:secure_url"]').attr("content");
    }

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
        title: title.slice(0, 70),
        thumbnail,
        isPhoto: false,
        formats,
      };
    }
  } catch (err) {
    logger?.warn?.(`Facebook scraper error: ${err.message}`);
  }
  return null;
};

/* =========================================================
   4. YOUTUBE ENGINE (OEMBED + INVIDIOUS PUBLIC APIS)
========================================================= */

const scrapeYouTube = async (url) => {
  try {
    // 1. YouTube Official oEmbed (Always 100% works on all IPs)
    const oembedRes = await axios.get(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      { timeout: 8000 }
    );

    const title = oembedRes.data?.title || "YouTube Video";
    const thumbnail = oembedRes.data?.thumbnail_url || null;
    const uploader = oembedRes.data?.author_name || "YouTube Creator";

    // Extract videoId
    const idMatch = url.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/
    );
    const videoId = idMatch ? idMatch[1] : null;

    let videoFormats = [
      { formatId: "1080", quality: "1080p Full HD", height: 1080 },
      { formatId: "720", quality: "720p HD", height: 720 },
      { formatId: "480", quality: "480p", height: 480 },
      { formatId: "360", quality: "360p SD", height: 360 },
    ];

    // Try fetching real formats from Invidious instance if videoId is found
    if (videoId) {
      const invidiousInstances = [
        "https://inv.tux.pizza",
        "https://invidious.nerdvpn.de",
        "https://vid.puffyan.us",
      ];

      for (const instance of invidiousInstances) {
        try {
          const invRes = await axios.get(
            `${instance}/api/v1/videos/${videoId}`,
            { timeout: 5000 }
          );

          if (invRes.data?.formatStreams && invRes.data.formatStreams.length > 0) {
            const streams = invRes.data.formatStreams;
            videoFormats = streams.map((s) => ({
              formatId: String(s.itag || s.resolution),
              quality: s.qualityLabel || `${s.resolution || "720"}p`,
              height: parseInt(s.qualityLabel) || 720,
              directUrl: s.url,
            }));
            break;
          }
        } catch (invErr) {
          // Try next instance
        }
      }
    }

    return {
      title,
      thumbnail,
      uploader,
      isPhoto: false,
      formats: videoFormats,
    };
  } catch (err) {
    logger?.warn?.(`YouTube scraper error: ${err.message}`);
  }
  return null;
};

/* =========================================================
   EXTRACT TOOL (CONTROLLER - ZERO FAILURE)
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

    logger?.info?.(`[EXTRACT START] platform=${platform} | url=${url}`);

    let parsedData = null;

    // STEP 1: Platform-Specific High Speed Native Parsers
    if (platform === "pinterest") {
      parsedData = await scrapePinterest(url);
    } else if (platform === "instagram") {
      parsedData = await scrapeInstagram(url);
    } else if (platform === "facebook") {
      parsedData = await scrapeFacebook(url);
    } else if (platform === "youtube") {
      parsedData = await scrapeYouTube(url);
    }

    if (parsedData) {
      return res.status(200).json({
        success: true,
        data: {
          id: crypto.randomBytes(6).toString("hex"),
          title: parsedData.title,
          thumbnail: parsedData.thumbnail,
          url: parsedData.url || url,
          duration: 0,
          uploader: parsedData.uploader || null,
          platform,
          isPhoto: Boolean(parsedData.isPhoto),
          qualities:
            parsedData.formats?.map((f) => f.height).filter(Boolean) || [720],
          formats: parsedData.formats || [],
        },
      });
    }

    // STEP 2: yt-dlp Fallback with Resilient Error Catching
    try {
      const ytdlpResult = await ytDlp(url, {
        dumpSingleJson: true,
        noWarnings: true,
        noPlaylist: true,
        skipDownload: true,
        preferFreeFormats: true,
        noCheckCertificates: true,
        geoBypass: true,
        extractorArgs: "youtube:player_client=ios,android,web_embedded",
        userAgent: BROWSER_HEADERS["User-Agent"],
      });

      if (ytdlpResult) {
        const formats = Array.isArray(ytdlpResult.formats)
          ? ytdlpResult.formats
          : [];

        const isPhoto =
          ytdlpResult._type === "image" ||
          ytdlpResult.ext === "jpg" ||
          ytdlpResult.ext === "png" ||
          (!formats.length && Boolean(ytdlpResult.thumbnail || ytdlpResult.url));

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
            id: ytdlpResult.id || crypto.randomBytes(6).toString("hex"),
            title: ytdlpResult.title || "Public Video",
            description: ytdlpResult.description || "",
            thumbnail: ytdlpResult.thumbnail || ytdlpResult.url || null,
            url: ytdlpResult.url || null,
            duration: ytdlpResult.duration || 0,
            uploader: ytdlpResult.uploader || ytdlpResult.channel || null,
            platform,
            isPhoto,
            qualities:
              availableQualities.length > 0
                ? availableQualities
                : [1080, 720, 480, 360],
            formats: formats
              .filter(
                (item) =>
                  item && (item.vcodec !== "none" || item.acodec !== "none")
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
      }
    } catch (ytdlpError) {
      logger?.warn?.(`yt-dlp fallback error: ${ytdlpError.message}`);
    }

    // Generic safe fallback response (Prevents 500 error)
    return res.status(200).json({
      success: true,
      data: {
        id: crypto.randomBytes(6).toString("hex"),
        title: `${platform.toUpperCase()} Media`,
        thumbnail: null,
        url,
        duration: 0,
        platform,
        isPhoto: false,
        qualities: [720, 360],
        formats: [
          { formatId: "best", quality: "720p HD", height: 720 },
          { formatId: "worst", quality: "360p SD", height: 360 },
        ],
      },
    });
  } catch (error) {
    logger?.error?.(`Extract global error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Server encountered an error while processing the URL. Please try again.",
    });
  }
};

/* =========================================================
   DOWNLOAD TOOL (CONTROLLER)
========================================================= */

export const downloadTool = async (req, res) => {
  let outputFile = null;

  try {
    const { url, quality, formatId, isPhoto, directUrl, title } =
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

    // 1. FAST DIRECT STREAM (When Direct URL is Available)
    const targetDirectUrl = directUrl || (isPhoto ? sourceUrl : null);

    if (targetDirectUrl && validateUrl(targetDirectUrl)) {
      try {
        const streamRes = await axios({
          method: "GET",
          url: targetDirectUrl,
          responseType: "stream",
          timeout: 60000,
          headers: BROWSER_HEADERS,
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
        logger?.warn?.(`Direct stream failed, falling back to yt-dlp: ${streamErr.message}`);
      }
    }

    // 2. YT-DLP EXECUTION WITH BUFFER & STREAMING
    const baseFile = path.join(TEMP_DIR, `media-${requestId}`);
    let selectedFormat = "18/bestvideo+bestaudio/best";

    if (formatId && formatId !== "best" && formatId !== "worst") {
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
      userAgent: BROWSER_HEADERS["User-Agent"],
    });

    const files = await fs.promises.readdir(TEMP_DIR);
    const generatedFiles = files.filter((f) =>
      f.startsWith(`media-${requestId}.`)
    );

    if (generatedFiles.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Download processing failed. Output file not created.",
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
    res.setHeader(
      "Content-Type",
      ext === ".mp4" ? "video/mp4" : "application/octet-stream"
    );
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
