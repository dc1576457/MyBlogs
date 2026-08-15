import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import axios from "axios";
import * as cheerio from "cheerio";
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

const extractYouTubeId = (url) => {
  const match = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/
  );
  return match ? match[1] : null;
};

const cleanFileName = (name) => {
  return String(name || "download")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
};

/* =========================================================
   1. PINTEREST ENGINE
========================================================= */

const scrapePinterest = async (url) => {
  try {
    let targetUrl = url;

    if (url.includes("pin.it")) {
      try {
        const redirectRes = await axios.get(url, {
          headers: BROWSER_HEADERS,
          maxRedirects: 5,
          timeout: 8000,
        });
        targetUrl = redirectRes.request?.res?.responseUrl || url;
      } catch (e) {
        // Continue
      }
    }

    const pinIdMatch = targetUrl.match(/\/pin\/(\d+)/);
    const pinId = pinIdMatch ? pinIdMatch[1] : null;

    if (pinId) {
      try {
        const pidgetRes = await axios.get(
          `https://api.pinterest.com/v3/pidgets/pins/info/?pin_ids=${pinId}`,
          { headers: BROWSER_HEADERS, timeout: 8000 }
        );

        const pinData = pidgetRes.data?.data?.pins?.[0];
        if (pinData) {
          const title = pinData.description || "Pinterest Media";
          const imageUrl =
            pinData.images?.orig?.url || pinData.images?.["736x"]?.url;

          return {
            title: title.slice(0, 70),
            thumbnail: imageUrl || null,
            url: imageUrl,
            isPhoto: true,
            formats: [],
          };
        }
      } catch (e) {
        // Fallback
      }
    }

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
      const mp4Matches = html.match(
        /https:\/\/[^"'\s]+\.pinimg\.com\/videos\/[^"'\s]+\.mp4/g
      );
      if (mp4Matches && mp4Matches.length > 0) {
        videoUrl =
          mp4Matches.find((u) => u.includes("720p") || u.includes("V_720P")) ||
          mp4Matches[0];
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
   2. INSTAGRAM ENGINE (MULTI-LEVEL SCRAPER)
========================================================= */

const scrapeInstagram = async (url) => {
  try {
    const cleanUrl = url.split("?")[0].replace(/\/+$/, "");
    const shortcodeMatch = cleanUrl.match(/\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
    const shortcode = shortcodeMatch ? shortcodeMatch[1] : null;

    let videoUrl = null;
    let imageUrl = null;
    let caption = "Instagram Media";

    // Method A: Instagram Public GraphQL / Web API endpoint
    if (shortcode) {
      try {
        const gqlRes = await axios.get(
          `https://www.instagram.com/graphql/query/?doc_id=8845758582119845&variables=${encodeURIComponent(
            JSON.stringify({ shortcode })
          )}`,
          {
            headers: {
              ...BROWSER_HEADERS,
              "x-ig-app-id": "936619743392459",
              "x-asbd-id": "198387",
              "x-requested-with": "XMLHttpRequest",
            },
            timeout: 8000,
          }
        );

        const media = gqlRes.data?.data?.xdt_shortcode_media;
        if (media) {
          caption =
            media.edge_media_to_caption?.edges?.[0]?.node?.text ||
            media.title ||
            caption;
          imageUrl = media.display_url || media.thumbnail_src;
          if (media.is_video && media.video_url) {
            videoUrl = media.video_url;
          }
        }
      } catch (e) {
        // Fallback to method B
      }
    }

    // Method B: Instagram embed scraping
    if (!videoUrl && !imageUrl) {
      try {
        const embedUrl = `${cleanUrl}/embed/captioned/`;
        const res = await axios.get(embedUrl, {
          headers: {
            ...BROWSER_HEADERS,
            Referer: "https://www.instagram.com/",
          },
          timeout: 10000,
        });

        const html = res.data;
        const $ = cheerio.load(html);

        caption = $("div.Caption").text().trim() || caption;
        const videoTag = $("video").attr("src");
        if (videoTag) videoUrl = videoTag;

        if (!videoUrl) {
          const match =
            html.match(/"video_url":"([^"]+)"/) ||
            html.match(/"playable_url":"([^"]+)"/);
          if (match && match[1]) {
            videoUrl = JSON.parse(`"${match[1]}"`);
          }
        }

        imageUrl =
          $("img.EmbeddedMediaImage").attr("src") ||
          $('meta[property="og:image"]').attr("content");

        if (!imageUrl) {
          const imgMatch =
            html.match(/"display_url":"([^"]+)"/) ||
            html.match(/"thumbnail_src":"([^"]+)"/);
          if (imgMatch && imgMatch[1]) {
            imageUrl = JSON.parse(`"${imgMatch[1]}"`);
          }
        }
      } catch (e) {
        // Fallback
      }
    }

    // Method C: OEmbed fallback for caption/image
    if (!videoUrl && !imageUrl) {
      try {
        const oembedRes = await axios.get(
          `https://api.instagram.com/oembed/?url=${encodeURIComponent(cleanUrl)}`,
          { headers: BROWSER_HEADERS, timeout: 8000 }
        );
        imageUrl = oembedRes.data?.thumbnail_url || null;
        caption = oembedRes.data?.title || caption;
      } catch (e) {
        // Fallback
      }
    }

    if (videoUrl) {
      return {
        title: caption.slice(0, 70) || "Instagram Video",
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
   3. FACEBOOK ENGINE
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
   4. YOUTUBE ENGINE
========================================================= */

const scrapeYouTube = async (url) => {
  try {
    const videoId = extractYouTubeId(url);
    if (!videoId) return null;

    let title = "YouTube Video";
    let thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    let uploader = "YouTube Creator";

    try {
      const oembedRes = await axios.get(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
        { timeout: 8000 }
      );
      title = oembedRes.data?.title || title;
      thumbnail = oembedRes.data?.thumbnail_url || thumbnail;
      uploader = oembedRes.data?.author_name || uploader;
    } catch (e) {
      // Keep defaults
    }

    const formats = [
      { formatId: "720", quality: "720p HD", height: 720 },
      { formatId: "360", quality: "360p SD", height: 360 },
      { formatId: "480", quality: "480p", height: 480 },
      { formatId: "1080", quality: "1080p Full HD", height: 1080 },
    ];

    return {
      title,
      thumbnail,
      uploader,
      isPhoto: false,
      formats,
    };
  } catch (err) {
    logger?.warn?.(`YouTube scraper error: ${err.message}`);
  }
  return null;
};

/* =========================================================
   EXTRACT CONTROLLER
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

    let parsedData = null;

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
            parsedData.formats?.map((f) => f.height).filter(Boolean) || [720, 360],
          formats: parsedData.formats || [],
        },
      });
    }

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
          { formatId: "720", quality: "720p HD", height: 720 },
          { formatId: "360", quality: "360p SD", height: 360 },
        ],
      },
    });
  } catch (error) {
    logger?.error?.(`Extract global error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to extract media information.",
    });
  }
};

/* =========================================================
   DOWNLOAD CONTROLLER
========================================================= */

export const downloadTool = async (req, res) => {
  try {
    const { url, quality, isPhoto, directUrl, title } = req.body || {};

    const sourceUrl = url?.trim();
    if (!sourceUrl || !validateUrl(sourceUrl)) {
      return res.status(400).json({
        success: false,
        message: "Valid media URL is required.",
      });
    }

    const platform = getPlatform(sourceUrl);
    const cleanBaseTitle = cleanFileName(title);

    // 1. STREAM FOR MEDIA WITH DIRECT URLS (INSTAGRAM, PINTEREST, FACEBOOK)
    let targetDirectUrl = directUrl;

    if (!targetDirectUrl && platform === "instagram") {
      const igData = await scrapeInstagram(sourceUrl);
      if (igData?.formats?.[0]?.directUrl) {
        targetDirectUrl = igData.formats[0].directUrl;
      } else if (igData?.url) {
        targetDirectUrl = igData.url;
      }
    }

    if (!targetDirectUrl && platform === "pinterest") {
      const pinData = await scrapePinterest(sourceUrl);
      if (pinData?.formats?.[0]?.directUrl) {
        targetDirectUrl = pinData.formats[0].directUrl;
      } else if (pinData?.url) {
        targetDirectUrl = pinData.url;
      }
    }

    if (targetDirectUrl && validateUrl(targetDirectUrl)) {
      try {
        const streamRes = await axios({
          method: "GET",
          url: targetDirectUrl,
          responseType: "stream",
          timeout: 120000,
          headers: {
            ...BROWSER_HEADERS,
            Referer: platform === "instagram" ? "https://www.instagram.com/" : undefined,
          },
        });

        const contentType =
          streamRes.headers["content-type"] ||
          (isPhoto ? "image/jpeg" : "video/mp4");

        // Validate content type is actually an audio/video/image and not an HTML blocking page
        if (!contentType.includes("text/html")) {
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
        }
      } catch (streamErr) {
        logger?.warn?.(`Direct stream pipe failed: ${streamErr.message}`);
      }
    }

    // 2. YOUTUBE STANDARD MP4 REDIRECT STREAM (FIXES UNPLAYABLE / CORRUPTED FILES)
    if (platform === "youtube") {
      const videoId = extractYouTubeId(sourceUrl);
      const chosenQuality = quality || 720;
      
      // Return high quality directly playable download stream
      return res.status(200).json({
        success: true,
        downloadUrl: `https://api.vevioz.com/api/button/mp4/${videoId}`,
        filename: `${cleanBaseTitle}.mp4`,
        quality: chosenQuality,
        size: 0,
        isPhoto: false,
      });
    }

    // 3. FAILSAFE FAST DIRECT DOWNLOAD
    return res.status(200).json({
      success: true,
      downloadUrl: sourceUrl,
      filename: `${cleanBaseTitle}.${isPhoto ? "jpg" : "mp4"}`,
      quality: quality || 720,
      size: 0,
      isPhoto: Boolean(isPhoto),
    });
  } catch (error) {
    logger?.error?.(`DOWNLOAD ERROR: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to download media. Please try again.",
    });
  }
};
