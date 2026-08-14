import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import axios from "axios";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/* =========================================================
   URL VALIDATION HELPERS
========================================================= */

export const isYouTubeUrl = (value) => {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    return (
      hostname === "youtube.com" ||
      hostname === "m.youtube.com" ||
      hostname === "youtu.be"
    );
  } catch {
    return false;
  }
};

export const isFacebookUrl = (value) => {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    return (
      hostname === "facebook.com" ||
      hostname === "m.facebook.com" ||
      hostname === "fb.watch"
    );
  } catch {
    return false;
  }
};

export const isInstagramUrl = (value) => {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    return hostname === "instagram.com" || hostname === "m.instagram.com";
  } catch {
    return false;
  }
};

export const isPinterestUrl = (value) => {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    return (
      hostname === "pinterest.com" ||
      hostname === "m.pinterest.com" ||
      hostname === "pin.it" ||
      hostname.endsWith(".pinterest.com")
    );
  } catch {
    return false;
  }
};

/* =========================================================
   YOUTUBE ENGINE (CLOUD / RENDER BYPASS)
========================================================= */

const getYouTubeStreamUrl = async (url, quality = "720") => {
  const instances = [
    "https://api.cobalt.tools",
    "https://cobalt.kwiatekm.pl",
    "https://co.wuk.sh",
  ];

  for (const instance of instances) {
    try {
      const response = await axios.post(
        `${instance}/`,
        {
          url,
          videoQuality: String(quality),
          downloadMode: "auto",
        },
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
          },
          timeout: 8000,
        }
      );

      if (response.data && response.data.url) {
        return response.data.url;
      }
    } catch {
      // try next instance
    }
  }
  return null;
};

const extractYouTubeMeta = async (url) => {
  try {
    let videoId = "";
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      videoId = match[2];
    }

    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const response = await axios.get(oembedUrl, {
      headers: { "User-Agent": USER_AGENT },
      timeout: 8000,
    });

    const thumbnail = videoId
      ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      : response.data?.thumbnail_url;

    return {
      id: videoId || crypto.randomBytes(6).toString("hex"),
      title: response.data?.title || "YouTube Video",
      thumbnail: thumbnail || null,
      uploader: response.data?.author_name || "YouTube Creator",
      webpageUrl: url,
      formats: [
        { height: 1080, filesizeText: "1080p Full HD" },
        { height: 720, filesizeText: "720p HD" },
        { height: 480, filesizeText: "480p SD" },
        { height: 360, filesizeText: "360p SD" },
      ],
    };
  } catch (err) {
    return null;
  }
};

/* =========================================================
   INSTAGRAM FAST SCRAPER
========================================================= */

const extractInstagramData = async (url) => {
  try {
    const match = url.match(/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
    if (!match) return null;
    const shortcode = match[1];
    const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;

    const response = await axios.get(embedUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
      timeout: 10000,
    });

    const html = String(response.data);
    const videoMatch =
      html.match(/"video_url"\s*:\s*"([^"]+)"/i) ||
      html.match(/<video[^>]+src="([^"]+)"/i);

    const imgMatch =
      html.match(/"display_url"\s*:\s*"([^"]+)"/i) ||
      html.match(/<img[^>]+class="EmbeddedMediaImage"[^>]+src="([^"]+)"/i) ||
      html.match(/<meta property="og:image" content="([^"]+)"/i);

    const titleMatch = html.match(/<div class="Caption"[^>]*>([\s\S]*?)<\/div>/i);
    let title = "Instagram Media";
    if (titleMatch) {
      title = titleMatch[1].replace(/<[^>]+>/g, "").trim().slice(0, 80) || "Instagram Media";
    }

    const videoUrl = videoMatch
      ? videoMatch[1].replace(/\\u0026/g, "&").replace(/&amp;/g, "&").replace(/\\/g, "")
      : null;
    const imgUrl = imgMatch
      ? imgMatch[1].replace(/\\u0026/g, "&").replace(/&amp;/g, "&").replace(/\\/g, "")
      : null;

    if (videoUrl) {
      return {
        id: shortcode,
        title,
        thumbnail: imgUrl,
        webpageUrl: url,
        formats: [
          { height: 1080, filesizeText: "HD Video", directUrl: videoUrl },
          { height: 720, filesizeText: "720p Video", directUrl: videoUrl },
          { height: 480, filesizeText: "480p Video", directUrl: videoUrl },
          { height: 360, filesizeText: "360p Video", directUrl: videoUrl },
        ],
      };
    } else if (imgUrl) {
      return {
        id: shortcode,
        title: "Instagram Photo",
        thumbnail: imgUrl,
        isPhoto: true,
        webpageUrl: url,
        formats: [
          { height: 1080, filesizeText: "High Quality Photo", directUrl: imgUrl },
        ],
      };
    }
  } catch (err) {
    console.error("Instagram Scraper Error:", err.message);
  }
  return null;
};

/* =========================================================
   FACEBOOK FAST SCRAPER
========================================================= */

const extractFacebookData = async (url) => {
  try {
    const embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`;
    const response = await axios.get(embedUrl, {
      headers: { "User-Agent": USER_AGENT },
      timeout: 10000,
    });

    const html = String(response.data);
    const hdMatch = html.match(/hd_src\s*:\s*"([^"]+)"/i) || html.match(/"hd_src_no_ratelimit"\s*:\s*"([^"]+)"/i);
    const sdMatch = html.match(/sd_src\s*:\s*"([^"]+)"/i) || html.match(/"sd_src_no_ratelimit"\s*:\s*"([^"]+)"/i);
    const thumbMatch = html.match(/thumbnail_src\s*:\s*"([^"]+)"/i) || html.match(/<meta property="og:image" content="([^"]+)"/i);

    const hdUrl = hdMatch ? hdMatch[1].replace(/\\/g, "").replace(/&amp;/g, "&") : null;
    const sdUrl = sdMatch ? sdMatch[1].replace(/\\/g, "").replace(/&amp;/g, "&") : null;
    const thumbUrl = thumbMatch ? thumbMatch[1].replace(/\\/g, "").replace(/&amp;/g, "&") : null;
    const videoUrl = hdUrl || sdUrl;

    if (videoUrl) {
      return {
        id: crypto.randomBytes(8).toString("hex"),
        title: "Facebook Video",
        thumbnail: thumbUrl,
        webpageUrl: url,
        formats: [
          { height: 1080, filesizeText: "HD Quality", directUrl: hdUrl || videoUrl },
          { height: 720, filesizeText: "SD Quality", directUrl: sdUrl || videoUrl },
          { height: 480, filesizeText: "480p Video", directUrl: sdUrl || videoUrl },
          { height: 360, filesizeText: "360p Video", directUrl: sdUrl || videoUrl },
        ],
      };
    }
  } catch (err) {
    console.error("Facebook Scraper Error:", err.message);
  }
  return null;
};

/* =========================================================
   PINTEREST FAST SCRAPER
========================================================= */

const extractPinterestData = async (url) => {
  try {
    let targetUrl = url;
    if (url.includes("pin.it")) {
      const headRes = await axios.get(url, {
        headers: { "User-Agent": USER_AGENT },
        maxRedirects: 5,
        timeout: 8000,
      });
      targetUrl = headRes.request?.res?.responseUrl || headRes.config?.url || url;
    }

    const response = await axios.get(targetUrl, {
      headers: { "User-Agent": USER_AGENT },
      timeout: 10000,
    });

    const html = String(response.data);
    const videoMatch =
      html.match(/<meta property="og:video" content="([^"]+)"/i) ||
      html.match(/<meta property="og:video:secure_url" content="([^"]+)"/i) ||
      html.match(/<video[^>]+src="([^"]+)"/i) ||
      html.match(/"url":\s*"([^"]+\.mp4[^"]*)"/i);

    const imageMatch =
      html.match(/<meta property="og:image" content="([^"]+)"/i) ||
      html.match(/<meta name="twitter:image" content="([^"]+)"/i);

    const titleMatch =
      html.match(/<meta property="og:title" content="([^"]+)"/i) ||
      html.match(/<title>([^<]+)<\/title>/i);

    const title = titleMatch
      ? titleMatch[1].replace(" | Pinterest", "").replace(/&quot;/g, '"').trim()
      : "Pinterest Media";

    let thumbnail = imageMatch ? imageMatch[1] : null;
    if (thumbnail) {
      thumbnail = thumbnail
        .replace(/\/236x\//, "/originals/")
        .replace(/\/474x\//, "/originals/")
        .replace(/\/736x\//, "/originals/");
    }

    if (videoMatch && videoMatch[1]) {
      const cleanVideoUrl = videoMatch[1].replace(/\\u0026/g, "&").replace(/\\/g, "").replace(/&amp;/g, "&");
      return {
        id: crypto.randomBytes(8).toString("hex"),
        title,
        thumbnail,
        webpageUrl: targetUrl,
        formats: [
          { height: 1080, filesizeText: "HD Video", directUrl: cleanVideoUrl },
          { height: 720, filesizeText: "SD Video", directUrl: cleanVideoUrl },
          { height: 480, filesizeText: "480p Video", directUrl: cleanVideoUrl },
          { height: 360, filesizeText: "360p Video", directUrl: cleanVideoUrl },
        ],
      };
    } else if (thumbnail) {
      return {
        id: crypto.randomBytes(8).toString("hex"),
        title,
        thumbnail,
        isPhoto: true,
        webpageUrl: targetUrl,
        formats: [{ height: 1080, filesizeText: "Original High-Res Photo", directUrl: thumbnail }],
      };
    }
  } catch (err) {
    console.error("Pinterest Scraper Error:", err.message);
  }
  return null;
};

/* =========================================================
   EXTRACT CONTROLLER
========================================================= */

export const extractTool = async (req, res) => {
  try {
    const { tool, url } = req.body;

    if (!tool || !url) {
      return res.status(400).json({ success: false, message: "Tool and URL are required." });
    }

    const cleanUrl = url.trim();

    /* 1. YOUTUBE */
    if (tool === "youtube-video-downloader") {
      if (!isYouTubeUrl(cleanUrl)) {
        return res.status(400).json({ success: false, message: "Please enter a valid YouTube URL." });
      }

      const meta = await extractYouTubeMeta(cleanUrl);
      if (meta) {
        return res.status(200).json({ success: true, data: meta });
      }
    }

    /* 2. INSTAGRAM */
    if (tool === "instagram-video-downloader") {
      if (!isInstagramUrl(cleanUrl)) {
        return res.status(400).json({ success: false, message: "Please enter a valid Instagram URL." });
      }
      const data = await extractInstagramData(cleanUrl);
      if (data) return res.status(200).json({ success: true, data });
    }

    /* 3. FACEBOOK */
    if (tool === "facebook-video-downloader") {
      if (!isFacebookUrl(cleanUrl)) {
        return res.status(400).json({ success: false, message: "Please enter a valid Facebook URL." });
      }
      const data = await extractFacebookData(cleanUrl);
      if (data) return res.status(200).json({ success: true, data });
    }

    /* 4. PINTEREST */
    if (tool === "pinterest-downloader") {
      if (!isPinterestUrl(cleanUrl)) {
        return res.status(400).json({ success: false, message: "Please enter a valid Pinterest URL." });
      }
      const data = await extractPinterestData(cleanUrl);
      if (data) return res.status(200).json({ success: true, data });
    }

    return res.status(400).json({
      success: false,
      message: "Unable to extract media. Please ensure the link is publicly accessible.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to extract media.",
    });
  }
};

/* =========================================================
   DOWNLOAD CONTROLLER (STREAM PIPELINE)
========================================================= */

export const downloadTool = async (req, res) => {
  const { tool, url, quality, directUrl } = req.body;

  if (!tool || !url) {
    return res.status(400).json({ success: false, message: "Tool and URL are required." });
  }

  const numericQuality = Number(quality) || 720;
  let targetDownloadUrl = directUrl;

  // YouTube bypass resolution
  if (!targetDownloadUrl && isYouTubeUrl(url)) {
    targetDownloadUrl = await getYouTubeStreamUrl(url, numericQuality);
  }

  // Stream directly to browser
  if (targetDownloadUrl && targetDownloadUrl.startsWith("http")) {
    try {
      const streamResponse = await axios({
        method: "GET",
        url: targetDownloadUrl,
        responseType: "stream",
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "*/*",
        },
        timeout: 90000,
      });

      const contentType = streamResponse.headers["content-type"] || "video/mp4";
      const isPhoto = contentType.includes("image");
      const ext = isPhoto ? "jpg" : "mp4";

      res.status(200);
      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${tool.split("-")[0]}-${numericQuality}p-${Date.now()}.${ext}"`
      );

      if (streamResponse.headers["content-length"]) {
        res.setHeader("Content-Length", streamResponse.headers["content-length"]);
      }

      return streamResponse.data.pipe(res);
    } catch (streamErr) {
      console.warn("Direct stream pipe failed:", streamErr.message);
    }
  }

  return res.status(500).json({
    success: false,
    message: "Download failed. The media source may be protected or restricted by the platform.",
  });
};
