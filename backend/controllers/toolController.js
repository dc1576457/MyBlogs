import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import axios from "axios";
import youtubedl from "youtube-dl-exec";

/* =========================================================
   URL VALIDATIONS
========================================================= */

const isYouTubeUrl = (value) => {
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

const isFacebookUrl = (value) => {
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

const isInstagramUrl = (value) => {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    return (
      hostname === "instagram.com" ||
      hostname === "m.instagram.com"
    );
  } catch {
    return false;
  }
};

const isPinterestUrl = (value) => {
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
   HELPERS & HEADERS
========================================================= */

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

const formatBytes = (bytes) => {
  if (!bytes) return null;
  const value = Number(bytes);
  if (!Number.isFinite(value)) return null;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

/* =========================================================
   COMMON YT-DLP OPTIONS (FIXED YOUTUBE PLAYER CLIENT)
========================================================= */

const getCommonOptions = () => {
  return {
    noPlaylist: true,
    noWriteThumbnail: true,
    noWriteSubs: true,
    noCheckCertificates: true,
    restrictFilenames: true,
    // FIX: Using ios,mweb,android bypasses YouTube sign-in/bot restriction errors
    extractorArgs: "youtube:player_client=ios,mweb,android",
    retries: 5,
    fragmentRetries: 5,
    concurrentFragments: 4,
    noAbortOnError: true,
    addHeader: [`User-Agent:${USER_AGENT}`],
  };
};

/* =========================================================
   YOUTUBE OEMBED FALLBACK
========================================================= */

const extractYouTubeOembed = async (url) => {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const response = await axios.get(oembedUrl, { timeout: 8000 });
    if (response.data) {
      return {
        id: crypto.randomBytes(8).toString("hex"),
        title: response.data.title || "YouTube Video",
        thumbnail: response.data.thumbnail_url || null,
        uploader: response.data.author_name || "YouTube Creator",
        webpageUrl: url,
        formats: [
          { height: 1080, filesizeText: "1080p Full HD" },
          { height: 720, filesizeText: "720p HD" },
          { height: 480, filesizeText: "480p SD" },
          { height: 360, filesizeText: "360p SD" },
        ],
      };
    }
  } catch (err) {
    console.error("YouTube oEmbed fallback error:", err.message);
  }
  return null;
};

/* =========================================================
   FAST SCRAPERS (INSTAGRAM, FACEBOOK, PINTEREST)
========================================================= */

// INSTAGRAM SCRAPER
const extractInstagramFallback = async (url) => {
  try {
    const match = url.match(/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
    if (!match) return null;
    const shortcode = match[1];
    const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;

    const response = await axios.get(embedUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      timeout: 10000,
    });

    const html = response.data;
    const videoMatch =
      html.match(/"video_url"\s*:\s*"([^"]+)"/i) ||
      html.match(/<video[^>]+src="([^"]+)"/i) ||
      html.match(/class="Video"[^>]+src="([^"]+)"/i);

    const imgMatch =
      html.match(/"display_url"\s*:\s*"([^"]+)"/i) ||
      html.match(/<img[^>]+class="EmbeddedMediaImage"[^>]+src="([^"]+)"/i) ||
      html.match(/<meta property="og:image" content="([^"]+)"/i);

    const titleMatch = html.match(/<div class="Caption"[^>]*>([\s\S]*?)<\/div>/i);
    let title = "Instagram Media";
    if (titleMatch) {
      title = titleMatch[1].replace(/<[^>]+>/g, "").trim().slice(0, 80) || "Instagram Media";
    }

    const videoUrl = videoMatch ? videoMatch[1].replace(/\\u0026/g, "&").replace(/&amp;/g, "&") : null;
    const imgUrl = imgMatch ? imgMatch[1].replace(/\\u0026/g, "&").replace(/&amp;/g, "&") : null;

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
    console.error("Instagram fast fallback error:", err.message);
  }
  return null;
};

// FACEBOOK SCRAPER
const extractFacebookFallback = async (url) => {
  try {
    const embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`;
    const response = await axios.get(embedUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "en-US,en;q=0.9",
      },
      timeout: 10000,
    });

    const html = response.data;
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
    console.error("Facebook fast fallback error:", err.message);
  }
  return null;
};

// PINTEREST SCRAPER
const extractPinterestFallback = async (url) => {
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
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "en-US,en;q=0.9",
      },
      timeout: 10000,
    });

    const html = response.data;
    const videoMatch =
      html.match(/<meta property="og:video" content="([^"]+)"/i) ||
      html.match(/<meta property="og:video:secure_url" content="([^"]+)"/i) ||
      html.match(/<video[^>]+src="([^"]+)"/i) ||
      html.match(/"V_720P":\s*\{\s*"url":\s*"([^"]+)"/i) ||
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
      thumbnail = thumbnail.replace(/\/236x\//, "/originals/").replace(/\/474x\//, "/originals/").replace(/\/736x\//, "/originals/");
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
        formats: [
          { height: 1080, filesizeText: "Original High-Res Photo", directUrl: thumbnail },
        ],
      };
    }
  } catch (err) {
    console.error("Pinterest fast fallback error:", err.message);
  }
  return null;
};

/* =========================================================
   YOUTUBE FORMAT PROCESSOR
========================================================= */

const extractVideoInfo = async (url) => {
  const options = {
    ...getCommonOptions(),
    dumpSingleJson: true,
    skipDownload: true,
    noWarnings: false,
    format: "bv*+ba/b/best",
  };

  return await youtubedl(url, options);
};

const getAvailableFormats = (info) => {
  const formats = Array.isArray(info?.formats) ? info.formats : [];
  const requestedQualities = [1080, 720, 480, 360];
  const result = [];

  for (const height of requestedQualities) {
    const candidates = formats.filter((format) => {
      const formatHeight = Number(format.height);
      return (
        formatHeight === height &&
        format.vcodec &&
        format.vcodec !== "none"
      );
    });

    if (!candidates.length) continue;

    candidates.sort((a, b) => {
      const aScore = (a.ext === "mp4" ? 100 : 0) + ((a.vcodec || "").includes("avc") ? 50 : 0);
      const bScore = (b.ext === "mp4" ? 100 : 0) + ((b.vcodec || "").includes("avc") ? 50 : 0);
      return bScore - aScore;
    });

    const selected = candidates[0];

    result.push({
      height,
      width: selected.width || null,
      fps: selected.fps || null,
      ext: selected.ext || "mp4",
      formatId: selected.format_id || null,
      filesize: selected.filesize || selected.filesize_approx || null,
      filesizeText: formatBytes(selected.filesize || selected.filesize_approx) || `${height}p Video`,
      hasAudio: Boolean(selected.acodec && selected.acodec !== "none"),
      directUrl: selected.url || null,
    });
  }

  // Failsafe if format height array wasn't found
  if (result.length === 0) {
    const defaultUrl = info?.url || (formats.find((f) => f.url)?.url) || null;
    requestedQualities.forEach((height) => {
      result.push({
        height,
        filesizeText: `${height}p Video`,
        directUrl: defaultUrl,
      });
    });
  }

  return result;
};

/* =========================================================
   EXTRACT CONTROLLER
========================================================= */

const extractTool = async (req, res) => {
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

      try {
        const info = await extractVideoInfo(cleanUrl);
        const formats = getAvailableFormats(info);

        return res.status(200).json({
          success: true,
          data: {
            id: info.id || null,
            title: info.title || "YouTube Video",
            thumbnail: info.thumbnail || null,
            uploader: info.uploader || info.channel || null,
            duration: info.duration_string || null,
            durationSeconds: info.duration || null,
            webpageUrl: info.webpage_url || cleanUrl,
            formats,
          },
        });
      } catch (ytErr) {
        console.warn("yt-dlp YouTube extraction failed, using oEmbed fallback:", ytErr?.message || ytErr);
        const oembedData = await extractYouTubeOembed(cleanUrl);
        if (oembedData) {
          return res.status(200).json({ success: true, data: oembedData });
        }

        return res.status(500).json({
          success: false,
          message: "Unable to extract YouTube video. Please ensure the link is public.",
        });
      }
    }

    /* 2. INSTAGRAM */
    if (tool === "instagram-video-downloader") {
      if (!isInstagramUrl(cleanUrl)) {
        return res.status(400).json({ success: false, message: "Please enter a valid Instagram URL." });
      }
      const instaData = await extractInstagramFallback(cleanUrl);
      if (instaData) {
        return res.status(200).json({ success: true, data: instaData });
      }
    }

    /* 3. FACEBOOK */
    if (tool === "facebook-video-downloader") {
      if (!isFacebookUrl(cleanUrl)) {
        return res.status(400).json({ success: false, message: "Please enter a valid Facebook URL." });
      }
      const fbData = await extractFacebookFallback(cleanUrl);
      if (fbData) {
        return res.status(200).json({ success: true, data: fbData });
      }
    }

    /* 4. PINTEREST */
    if (tool === "pinterest-downloader") {
      if (!isPinterestUrl(cleanUrl)) {
        return res.status(400).json({ success: false, message: "Please enter a valid Pinterest URL." });
      }
      const pinData = await extractPinterestFallback(cleanUrl);
      if (pinData) {
        return res.status(200).json({ success: true, data: pinData });
      }
    }

    /* GENERAL YT-DLP FALLBACK */
    try {
      const info = await youtubedl(cleanUrl, {
        ...getCommonOptions(),
        dumpSingleJson: true,
        skipDownload: true,
      });

      return res.status(200).json({
        success: true,
        data: {
          id: info.id || null,
          title: info.title || "Extracted Video",
          thumbnail: info.thumbnail || null,
          webpageUrl: cleanUrl,
          formats: [
            { height: 1080, filesizeText: "HD Video", directUrl: info.url },
            { height: 720, filesizeText: "SD Video", directUrl: info.url },
          ],
        },
      });
    } catch {
      return res.status(500).json({
        success: false,
        message: "Unable to extract video details from this link.",
      });
    }
  } catch (error) {
    console.error("EXTRACT CONTROLLER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Unable to extract video.",
    });
  }
};

/* =========================================================
   DOWNLOAD CONTROLLER
========================================================= */

const downloadTool = async (req, res) => {
  const { tool, url, quality, directUrl } = req.body;

  if (!tool || !url) {
    return res.status(400).json({ success: false, message: "Tool and URL are required." });
  }

  const numericQuality = Number(quality) || 720;

  /* DIRECT STREAM FOR CDN LINKS */
  if (directUrl && directUrl.startsWith("http")) {
    try {
      const streamResponse = await axios({
        method: "GET",
        url: directUrl,
        responseType: "stream",
        headers: {
          "User-Agent": USER_AGENT,
          "Referer": url,
        },
        timeout: 30000,
      });

      const contentType = streamResponse.headers["content-type"] || "video/mp4";
      const isImage = contentType.includes("image");
      const ext = isImage ? "jpg" : "mp4";

      res.status(200);
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="media-${numericQuality}p.${ext}"`);

      if (streamResponse.headers["content-length"]) {
        res.setHeader("Content-Length", streamResponse.headers["content-length"]);
      }

      return streamResponse.data.pipe(res);
    } catch (streamErr) {
      console.warn("Direct stream failed, falling back to yt-dlp:", streamErr.message);
    }
  }

  /* YT-DLP FILE DOWNLOAD (YOUTUBE / FALLBACK) */
  const tempDir = path.join(os.tmpdir(), "mern-tools-videos");
  await fs.promises.mkdir(tempDir, { recursive: true });

  const id = crypto.randomBytes(16).toString("hex");
  const outputTemplate = path.join(tempDir, `${id}.%(ext)s`);
  let filePath = null;

  try {
    const format =
      `bv*[height<=${numericQuality}][ext=mp4]+ba[ext=m4a]/` +
      `bv*[height<=${numericQuality}]+ba/` +
      `b[height<=${numericQuality}][ext=mp4]/` +
      `b[height<=${numericQuality}]/` +
      `bv*+ba/b/best`;

    const options = {
      ...getCommonOptions(),
      output: outputTemplate,
      format,
      mergeOutputFormat: "mp4",
      remuxVideo: "mp4",
      formatSort: "vcodec:h264,acodec:aac,res,fps",
      checkFormats: true,
      keepVideo: false,
      keepFragments: false,
    };

    await youtubedl(url, options);

    const files = await fs.promises.readdir(tempDir);
    const outputFile = files.find(
      (file) => file.startsWith(id) && /\.(mp4|webm|mkv|mov)$/i.test(file)
    );

    if (!outputFile) {
      throw new Error("Download completed, but failed to create local video file.");
    }

    filePath = path.join(tempDir, outputFile);
    const stats = await fs.promises.stat(filePath);

    if (!stats.size || stats.size <= 0) {
      throw new Error("Downloaded video file is empty.");
    }

    res.status(200);
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", `attachment; filename="video-${numericQuality}p.mp4"`);
    res.setHeader("Content-Length", stats.size);

    const stream = fs.createReadStream(filePath);

    stream.on("error", async () => {
      try { await fs.promises.unlink(filePath); } catch {}
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: "Unable to send video file." });
      }
    });

    stream.on("close", async () => {
      try { await fs.promises.unlink(filePath); } catch {}
    });

    stream.pipe(res);
  } catch (error) {
    console.error("VIDEO DOWNLOAD ERROR", error);

    try {
      const files = await fs.promises.readdir(tempDir);
      for (const file of files) {
        if (file.startsWith(id)) {
          await fs.promises.unlink(path.join(tempDir, file)).catch(() => {});
        }
      }
    } catch {}

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: error?.message || "Video download failed.",
      });
    }
  }
};

export {
  extractTool,
  downloadTool,
  isYouTubeUrl,
  isFacebookUrl,
  isInstagramUrl,
  isPinterestUrl,
};
