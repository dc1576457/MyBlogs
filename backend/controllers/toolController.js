import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import axios from "axios";
import * as cheerio from "cheerio";
import { logger } from "../utils/logger.js";

const TEMP_DIR = path.join(
  os.tmpdir(),
  "myblog-tools"
);

const ensureTempDirectory = () => {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, {
      recursive: true,
    });
  }
};

/* =========================================================
   BROWSER HEADERS
========================================================= */

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",

  "Accept-Language":
    "en-US,en;q=0.9",

  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
};

const YOUTUBE_HEADERS = {
  ...BROWSER_HEADERS,
  Referer:
    "https://www.youtube.com/",
  Origin:
    "https://www.youtube.com",
};

const INSTAGRAM_HEADERS = {
  ...BROWSER_HEADERS,
  Referer:
    "https://www.instagram.com/",
  Origin:
    "https://www.instagram.com",
};

const FACEBOOK_HEADERS = {
  ...BROWSER_HEADERS,
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Dest": "document",
};

/* =========================================================
   INVIDIOUS INSTANCES
========================================================= */

const INVIDIOUS_INSTANCES = [
  "https://inv.tux.pizza",
  "https://invidious.nerdvpn.de",
  "https://invidious.jing.rocks",
  "https://yewtu.be",
  "https://vid.puffyan.us",
];

/* =========================================================
   URL VALIDATION
========================================================= */

const validateUrl = (value) => {
  if (
    !value ||
    typeof value !== "string"
  ) {
    return false;
  }

  try {
    const parsed =
      new URL(value.trim());

    return (
      parsed.protocol === "http:" ||
      parsed.protocol === "https:"
    );
  } catch {
    return false;
  }
};

/* =========================================================
   PLATFORM
========================================================= */

const getPlatform = (url) => {
  try {
    const hostname =
      new URL(url)
        .hostname
        .toLowerCase()
        .replace(/^www\./, "");

    if (
      hostname === "youtube.com" ||
      hostname === "youtu.be" ||
      hostname === "m.youtube.com" ||
      hostname.endsWith(
        ".youtube.com"
      )
    ) {
      return "youtube";
    }

    if (
      hostname === "facebook.com" ||
      hostname === "fb.watch" ||
      hostname.endsWith(
        ".facebook.com"
      )
    ) {
      return "facebook";
    }

    if (
      hostname === "instagram.com" ||
      hostname === "m.instagram.com" ||
      hostname.endsWith(
        ".instagram.com"
      )
    ) {
      return "instagram";
    }

    if (
      hostname === "pinterest.com" ||
      hostname === "pin.it" ||
      hostname.endsWith(
        ".pinterest.com"
      )
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
    const parsed =
      new URL(url);

    if (
      parsed.hostname.includes(
        "youtu.be"
      )
    ) {
      return parsed.pathname
        .replace(/^\/+/, "")
        .split("/")[0]
        .slice(0, 11);
    }

    const v =
      parsed.searchParams.get(
        "v"
      );

    if (v) {
      return v.slice(0, 11);
    }

    const pathParts =
      parsed.pathname
        .split("/")
        .filter(Boolean);

    const shortsIndex =
      pathParts.indexOf(
        "shorts"
      );

    if (
      shortsIndex !== -1 &&
      pathParts[shortsIndex + 1]
    ) {
      return pathParts[
        shortsIndex + 1
      ].slice(0, 11);
    }

    const embedIndex =
      pathParts.indexOf(
        "embed"
      );

    if (
      embedIndex !== -1 &&
      pathParts[embedIndex + 1]
    ) {
      return pathParts[
        embedIndex + 1
      ].slice(0, 11);
    }

    return null;
  } catch {
    return null;
  }
};

/* =========================================================
   CLEAN FILE NAME
========================================================= */

const cleanFileName = (name) => {
  return String(
    name || "download"
  )
    .replace(
      /[<>:"/\\|?*\x00-\x1F]/g,
      ""
    )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
};

/* =========================================================
   CONTENT TYPE -> EXTENSION
========================================================= */

const getExtensionFromContentType = (
  contentType,
  fallback = "mp4"
) => {
  const type = String(
    contentType || ""
  ).toLowerCase();

  if (
    type.includes(
      "video/mp4"
    )
  ) {
    return "mp4";
  }

  if (
    type.includes(
      "video/webm"
    )
  ) {
    return "webm";
  }

  if (
    type.includes(
      "video/ogg"
    )
  ) {
    return "ogv";
  }

  if (
    type.includes(
      "image/jpeg"
    )
  ) {
    return "jpg";
  }

  if (
    type.includes(
      "image/png"
    )
  ) {
    return "png";
  }

  if (
    type.includes(
      "image/webp"
    )
  ) {
    return "webp";
  }

  return fallback;
};

/* =========================================================
   DECODE ESCAPED URL
========================================================= */

const decodeEscapedUrl = (value) => {
  if (!value) return null;

  try {
    let result = value;

    result = result
      .replace(
        /\\u0026/g,
        "&"
      )
      .replace(
        /\\u003d/g,
        "="
      )
      .replace(
        /\\u002F/g,
        "/"
      )
      .replace(
        /\\\//g,
        "/"
      )
      .replace(
        /\\u0025/g,
        "%"
      )
      .replace(
        /&amp;/g,
        "&"
      );

    try {
      result =
        JSON.parse(
          `"${result}"`
        );
    } catch {
      // Already decoded
    }

    return result;
  } catch {
    return value;
  }
};

/* =========================================================
   1. PINTEREST ENGINE
========================================================= */

const scrapePinterest = async (
  url
) => {
  try {
    let targetUrl = url;

    if (
      url.includes("pin.it")
    ) {
      try {
        const redirectRes =
          await axios.get(
            url,
            {
              headers:
                BROWSER_HEADERS,
              maxRedirects: 5,
              timeout: 8000,
            }
          );

        targetUrl =
          redirectRes.request
            ?.res
            ?.responseUrl ||
          url;
      } catch {
        // Continue
      }
    }

    const pinIdMatch =
      targetUrl.match(
        /\/pin\/(\d+)/
      );

    const pinId =
      pinIdMatch
        ? pinIdMatch[1]
        : null;

    if (pinId) {
      try {
        const pidgetRes =
          await axios.get(
            `https://api.pinterest.com/v3/pidgets/pins/info/?pin_ids=${pinId}`,
            {
              headers:
                BROWSER_HEADERS,
              timeout: 8000,
            }
          );

        const pinData =
          pidgetRes.data
            ?.data
            ?.pins?.[0];

        if (pinData) {
          const title =
            pinData.description ||
            "Pinterest Media";

          const imageUrl =
            pinData.images?.orig
              ?.url ||
            pinData.images?.[
              "736x"
            ]?.url;

          return {
            title:
              title.slice(0, 70),

            thumbnail:
              imageUrl || null,

            url:
              imageUrl,

            isPhoto: true,

            formats: [],
          };
        }
      } catch {
        // Fallback
      }
    }

    const res =
      await axios.get(
        targetUrl,
        {
          headers:
            BROWSER_HEADERS,
          timeout: 10000,
        }
      );

    const html =
      res.data;

    const $ =
      cheerio.load(html);

    let videoUrl = null;

    let imageUrl =
      $(
        'meta[property="og:image"]'
      ).attr("content");

    let title =
      $(
        'meta[property="og:title"]'
      ).attr("content") ||
      "Pinterest Media";

    const pwsData =
      $("#__PWS_DATA__").html();

    if (pwsData) {
      try {
        const json =
          JSON.parse(
            pwsData
          );

        const pins =
          json?.props
            ?.initialReduxState
            ?.pins || {};

        const pinKey =
          Object.keys(
            pins
          )[0];

        const pinObj =
          pins[pinKey];

        if (pinObj) {
          title =
            pinObj.title ||
            pinObj.grid_title ||
            title;

          imageUrl =
            pinObj.images
              ?.orig?.url ||
            imageUrl;

          const videos =
            pinObj.videos
              ?.video_list;

          if (videos) {
            videoUrl =
              videos.V_720P
                ?.url ||
              videos.V_HLSV4
                ?.url ||
              videos.V_EXP3
                ?.url ||
              Object.values(
                videos
              )[0]?.url;
          }
        }
      } catch {
        // Ignore
      }
    }

    if (!videoUrl) {
      const mp4Matches =
        html.match(
          /https:\/\/[^"'\s]+\.pinimg\.com\/videos\/[^"'\s]+\.mp4/g
        );

      if (
        mp4Matches &&
        mp4Matches.length > 0
      ) {
        videoUrl =
          mp4Matches.find(
            (u) =>
              u.includes(
                "720p"
              ) ||
              u.includes(
                "V_720P"
              )
          ) ||
          mp4Matches[0];
      }
    }

    if (videoUrl) {
      return {
        title:
          title.slice(0, 70),

        thumbnail:
          imageUrl || null,

        isPhoto: false,

        formats: [
          {
            formatId:
              "pin-720",

            quality:
              "720p HD",

            height: 720,

            directUrl:
              videoUrl,
          },
        ],
      };
    }

    if (imageUrl) {
      return {
        title:
          title.slice(0, 70),

        thumbnail:
          imageUrl,

        url:
          imageUrl,

        isPhoto: true,

        formats: [],
      };
    }
  } catch (err) {
    logger?.warn?.(
      `Pinterest scraper error: ${err.message}`
    );
  }

  return null;
};

/* =========================================================
   2. INSTAGRAM ENGINE
========================================================= */

const extractInstagramMediaUrls = (
  html
) => {
  const urls = [];

  const patterns = [
    /"video_url"\s*:\s*"([^"]+)"/gi,

    /"playable_url"\s*:\s*"([^"]+)"/gi,

    /"display_url"\s*:\s*"([^"]+)"/gi,

    /"thumbnail_src"\s*:\s*"([^"]+)"/gi,

    /"video_versions"\s*:\s*\[(.*?)\]/gis,
  ];

  for (
    const pattern of patterns
  ) {
    let match;

    while (
      (match =
        pattern.exec(html)) !==
      null
    ) {
      if (!match[1]) {
        continue;
      }

      if (
        match[1].startsWith(
          "http"
        )
      ) {
        urls.push(
          decodeEscapedUrl(
            match[1]
          )
        );
      } else {
        const nestedMatches =
          match[1].match(
            /"url"\s*:\s*"([^"]+)"/gi
          );

        if (
          nestedMatches
        ) {
          for (
            const nested of nestedMatches
          ) {
            const urlMatch =
              nested.match(
                /"url"\s*:\s*"([^"]+)"/i
              );

            if (
              urlMatch?.[1]
            ) {
              urls.push(
                decodeEscapedUrl(
                  urlMatch[1]
                )
              );
            }
          }
        }
      }
    }
  }

  return [
    ...new Set(
      urls.filter(Boolean)
    ),
  ];
};

const scrapeInstagram = async (
  url
) => {
  try {
    const cleanUrl =
      url
        .split("?")[0]
        .replace(
          /\/+$/,
          ""
        );

    let html = "";

    /*
     * First try normal Instagram page.
     */
    try {
      const response =
        await axios.get(
          cleanUrl,
          {
            headers:
              INSTAGRAM_HEADERS,

            timeout: 15000,

            maxRedirects: 5,
          }
        );

      html =
        response.data;
    } catch {
      /*
       * Fallback to embed page.
       */
      try {
        const response =
          await axios.get(
            `${cleanUrl}/embed/`,
            {
              headers:
                INSTAGRAM_HEADERS,

              timeout: 15000,

              maxRedirects: 5,
            }
          );

        html =
          response.data;
      } catch (error) {
        logger?.warn?.(
          `Instagram page request failed: ${error.message}`
        );

        return null;
      }
    }

    if (!html) {
      return null;
    }

    const $ =
      cheerio.load(html);

    let title =
      $(
        'meta[property="og:title"]'
      ).attr("content") ||
      $(
        'meta[name="description"]'
      ).attr("content") ||
      "Instagram Media";

    let thumbnail =
      $(
        'meta[property="og:image"]'
      ).attr("content") ||
      $(
        'meta[property="og:image:secure_url"]'
      ).attr("content") ||
      null;

    /*
     * Extract media URLs.
     */
    const mediaUrls =
      extractInstagramMediaUrls(
        html
      );

    let videoUrl = null;

    let imageUrl =
      thumbnail;

    /*
     * Prefer video.
     */
    for (
      const mediaUrl of mediaUrls
    ) {
      if (
        mediaUrl &&
        (
          mediaUrl.includes(
            ".mp4"
          ) ||
          mediaUrl.includes(
            "video"
          ) ||
          mediaUrl.includes(
            "scontent"
          )
        )
      ) {
        videoUrl =
          mediaUrl;

        break;
      }
    }

    /*
     * More video patterns.
     */
    if (!videoUrl) {
      const videoPatterns = [
        /"video_url":"([^"]+)"/i,

        /"playable_url":"([^"]+)"/i,

        /"video_versions":\s*\[\s*\{[^}]*"url":"([^"]+)"/i,
      ];

      for (
        const pattern of videoPatterns
      ) {
        const match =
          html.match(
            pattern
          );

        if (
          match?.[1]
        ) {
          videoUrl =
            decodeEscapedUrl(
              match[1]
            );

          break;
        }
      }
    }

    /*
     * Image patterns.
     */
    if (!imageUrl) {
      const imagePatterns = [
        /"display_url":"([^"]+)"/i,

        /"thumbnail_src":"([^"]+)"/i,

        /"image_versions2":\s*\{[\s\S]*?"url":"([^"]+)"/i,
      ];

      for (
        const pattern of imagePatterns
      ) {
        const match =
          html.match(
            pattern
          );

        if (
          match?.[1]
        ) {
          imageUrl =
            decodeEscapedUrl(
              match[1]
            );

          break;
        }
      }
    }

    if (videoUrl) {
      videoUrl =
        decodeEscapedUrl(
          videoUrl
        );
    }

    if (imageUrl) {
      imageUrl =
        decodeEscapedUrl(
          imageUrl
        );
    }

    /*
     * INSTAGRAM VIDEO
     */
    if (
      videoUrl &&
      validateUrl(videoUrl)
    ) {
      return {
        title:
          String(
            title ||
              "Instagram Video"
          ).slice(0, 70),

        thumbnail:
          imageUrl || null,

        isPhoto: false,

        formats: [
          {
            formatId:
              "instagram-video",

            quality:
              "HD Video",

            height: 720,

            directUrl:
              videoUrl,

            mimeType:
              "video/mp4",
          },
        ],
      };
    }

    /*
     * INSTAGRAM PHOTO
     */
    if (
      imageUrl &&
      validateUrl(imageUrl)
    ) {
      return {
        title:
          String(
            title ||
              "Instagram Photo"
          ).slice(0, 70),

        thumbnail:
          imageUrl,

        url:
          imageUrl,

        isPhoto: true,

        formats: [],
      };
    }

    logger?.warn?.(
      "Instagram media URL could not be found."
    );

    return null;
  } catch (err) {
    logger?.warn?.(
      `Instagram scraper error: ${err.message}`
    );

    return null;
  }
};

/* =========================================================
   3. FACEBOOK ENGINE
========================================================= */

const scrapeFacebook = async (
  url
) => {
  try {
    const res =
      await axios.get(
        url,
        {
          headers:
            FACEBOOK_HEADERS,

          timeout: 10000,
        }
      );

    const html =
      res.data;

    const $ =
      cheerio.load(html);

    let hdUrl = null;
    let sdUrl = null;

    const title =
      $(
        'meta[property="og:title"]'
      ).attr("content") ||
      "Facebook Video";

    const thumbnail =
      $(
        'meta[property="og:image"]'
      ).attr("content") ||
      null;

    const hdMatch =
      html.match(
        /"browser_native_hd_url":"([^"]+)"/
      ) ||
      html.match(
        /"playable_url_quality_hd":"([^"]+)"/
      );

    const sdMatch =
      html.match(
        /"browser_native_sd_url":"([^"]+)"/
      ) ||
      html.match(
        /"playable_url":"([^"]+)"/
      );

    if (
      hdMatch &&
      hdMatch[1]
    ) {
      hdUrl =
        JSON.parse(
          `"${hdMatch[1]}"`
        );
    }

    if (
      sdMatch &&
      sdMatch[1]
    ) {
      sdUrl =
        JSON.parse(
          `"${sdMatch[1]}"`
        );
    }

    if (!sdUrl) {
      sdUrl =
        $(
          'meta[property="og:video"]'
        ).attr("content") ||
        $(
          'meta[property="og:video:secure_url"]'
        ).attr("content");
    }

    if (
      hdUrl ||
      sdUrl
    ) {
      const formats = [];

      if (hdUrl) {
        formats.push({
          formatId:
            "fb-hd",

          quality:
            "720p HD",

          height: 720,

          directUrl:
            hdUrl,
        });
      }

      if (sdUrl) {
        formats.push({
          formatId:
            "fb-sd",

          quality:
            "360p SD",

          height: 360,

          directUrl:
            sdUrl,
        });
      }

      return {
        title:
          title.slice(0, 70),

        thumbnail,

        isPhoto: false,

        formats,
      };
    }
  } catch (err) {
    logger?.warn?.(
      `Facebook scraper error: ${err.message}`
    );
  }

  return null;
};

/* =========================================================
   4. YOUTUBE ENGINE
========================================================= */

const scrapeYouTube = async (
  url
) => {
  try {
    const videoId =
      extractYouTubeId(
        url
      );

    if (!videoId) {
      return null;
    }

    let title =
      "YouTube Video";

    let thumbnail = null;

    let uploader =
      "YouTube Creator";

    try {
      const oembedRes =
        await axios.get(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(
            url
          )}&format=json`,
          {
            timeout: 10000,

            headers:
              YOUTUBE_HEADERS,
          }
        );

      title =
        oembedRes.data
          ?.title ||
        title;

      thumbnail =
        oembedRes.data
          ?.thumbnail_url ||
        thumbnail;

      uploader =
        oembedRes.data
          ?.author_name ||
        uploader;
    } catch {
      thumbnail =
        `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }

    /*
     * ONLY 360 + 720
     */
    const formats = [
      {
        formatId:
          "18",

        quality:
          "360p SD",

        height: 360,

        mimeType:
          "video/mp4",
      },

      {
        formatId:
          "22",

        quality:
          "720p HD",

        height: 720,

        mimeType:
          "video/mp4",
      },
    ];

    return {
      title,

      thumbnail,

      uploader,

      isPhoto: false,

      formats,
    };
  } catch (err) {
    logger?.warn?.(
      `YouTube scraper error: ${err.message}`
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

    const platform =
      getPlatform(url);

    if (
      platform === "unknown"
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Unsupported platform URL.",
      });
    }

    let parsedData = null;

    if (
      platform ===
      "pinterest"
    ) {
      parsedData =
        await scrapePinterest(
          url
        );
    } else if (
      platform ===
      "instagram"
    ) {
      parsedData =
        await scrapeInstagram(
          url
        );
    } else if (
      platform ===
      "facebook"
    ) {
      parsedData =
        await scrapeFacebook(
          url
        );
    } else if (
      platform ===
      "youtube"
    ) {
      parsedData =
        await scrapeYouTube(
          url
        );
    }

    if (parsedData) {
      return res.status(200).json({
        success: true,

        data: {
          id: crypto
            .randomBytes(6)
            .toString("hex"),

          title:
            parsedData.title,

          thumbnail:
            parsedData.thumbnail,

          url:
            parsedData.url ||
            url,

          duration: 0,

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
                  format.height
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
        platform ===
        "instagram"
          ? "Unable to extract Instagram media. Make sure the post or reel is public."
          : platform ===
            "youtube"
          ? "Unable to extract YouTube video information. Please try again."
          : `Unable to extract ${platform} media. Make sure the media is public.`,
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
   YOUTUBE INVIDIOUS STREAM
========================================================= */

const getYouTubeStreamFromInvidious =
  async (
    videoId,
    quality
  ) => {
    const requestedQuality =
      Number(quality) || 720;

    for (
      const instance of INVIDIOUS_INSTANCES
    ) {
      try {
        const apiUrl =
          `${instance}/api/v1/videos/${videoId}`;

        const response =
          await axios.get(
            apiUrl,
            {
              headers:
                YOUTUBE_HEADERS,

              timeout: 15000,
            }
          );

        const data =
          response.data;

        if (!data) {
          continue;
        }

        const candidates = [];

        /*
         * Progressive MP4 streams.
         */
        if (
          Array.isArray(
            data.formatStreams
          )
        ) {
          for (
            const item of data.formatStreams
          ) {
            if (
              item?.url &&
              item?.type
            ) {
              candidates.push({
                url:
                  item.url,

                type:
                  item.type,

                quality:
                  item.qualityLabel ||
                  "",

                height:
                  Number(
                    item.height
                  ) || 0,

                bitrate:
                  Number(
                    item.bitrate
                  ) || 0,

                container:
                  item.container ||
                  "",
              });
            }
          }
        }

        /*
         * Adaptive MP4 streams.
         *
         * Only include streams that
         * contain audio as well.
         */
        if (
          Array.isArray(
            data.adaptiveFormats
          )
        ) {
          for (
            const item of data.adaptiveFormats
          ) {
            const type =
              String(
                item.type ||
                  ""
              );

            if (
              item?.url &&
              type.startsWith(
                "video/mp4"
              ) &&
              item.audioQuality
            ) {
              candidates.push({
                url:
                  item.url,

                type,

                quality:
                  item.qualityLabel ||
                  "",

                height:
                  Number(
                    item.height
                  ) || 0,

                bitrate:
                  Number(
                    item.bitrate
                  ) || 0,

                container:
                  item.container ||
                  "mp4",
              });
            }
          }
        }

        /*
         * IMPORTANT:
         * Only MP4 video streams.
         */
        const mp4Candidates =
          candidates.filter(
            (item) =>
              item.type.includes(
                "video/mp4"
              ) &&
              item.url
          );

        if (
          !mp4Candidates.length
        ) {
          continue;
        }

        /*
         * Prefer only 360 / 720.
         */
        const allowedCandidates =
          mp4Candidates.filter(
            (item) =>
              Number(
                item.height
              ) === 360 ||
              Number(
                item.height
              ) === 720
          );

        const usableCandidates =
          allowedCandidates.length
            ? allowedCandidates
            : mp4Candidates;

        /*
         * Closest quality.
         */
        usableCandidates.sort(
          (a, b) => {
            const aDiff =
              Math.abs(
                (a.height || 0) -
                  requestedQuality
              );

            const bDiff =
              Math.abs(
                (b.height || 0) -
                  requestedQuality
              );

            return (
              aDiff - bDiff
            );
          }
        );

        const selected =
          usableCandidates[0];

        if (
          selected?.url
        ) {
          return {
            ...selected,

            instance,
          };
        }
      } catch (error) {
        logger?.warn?.(
          `YouTube Invidious instance failed ${instance}: ${error.message}`
        );
      }
    }

    return null;
  };

/* =========================================================
   DOWNLOAD CONTROLLER
========================================================= */

export const downloadTool = async (
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
    } = req.body || {};

    const sourceUrl =
      url?.trim();

    if (
      !sourceUrl ||
      !validateUrl(sourceUrl)
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Valid media URL is required.",
      });
    }

    const platform =
      getPlatform(sourceUrl);

    const cleanBaseTitle =
      cleanFileName(
        title
      );

    /* =====================================================
       PINTEREST
    ===================================================== */

    if (
      platform ===
      "pinterest"
    ) {
      const targetDirectUrl =
        directUrl ||
        (isPhoto
          ? sourceUrl
          : null);

      if (
        targetDirectUrl &&
        validateUrl(
          targetDirectUrl
        )
      ) {
        try {
          const streamRes =
            await axios({
              method: "GET",

              url:
                targetDirectUrl,

              responseType:
                "stream",

              timeout:
                120000,

              headers:
                BROWSER_HEADERS,
            });

          const contentType =
            streamRes.headers[
              "content-type"
            ] ||
            (isPhoto
              ? "image/jpeg"
              : "video/mp4");

          let ext =
            isPhoto
              ? ".jpg"
              : ".mp4";

          if (
            contentType.includes(
              "png"
            )
          ) {
            ext = ".png";
          }

          if (
            contentType.includes(
              "webp"
            )
          ) {
            ext = ".webp";
          }

          if (
            contentType.includes(
              "webm"
            )
          ) {
            ext = ".webm";
          }

          const finalName =
            `${cleanBaseTitle}${ext}`;

          res.status(200);

          res.setHeader(
            "Content-Type",
            contentType
          );

          if (
            streamRes.headers[
              "content-length"
            ]
          ) {
            res.setHeader(
              "Content-Length",
              streamRes.headers[
                "content-length"
              ]
            );
          }

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

          return streamRes.data.pipe(
            res
          );
        } catch (streamErr) {
          logger?.warn?.(
            `Pinterest direct stream failed: ${streamErr.message}`
          );
        }
      }

      return res.status(422).json({
        success: false,

        message:
          "Pinterest media download is currently unavailable. Please extract the link again.",
      });
    }

    /* =====================================================
       INSTAGRAM
    ===================================================== */

    if (
      platform ===
      "instagram"
    ) {
      if (
        !directUrl ||
        !validateUrl(
          directUrl
        )
      ) {
        return res.status(422).json({
          success: false,

          message:
            "Instagram media URL is unavailable. Please extract the post again.",
        });
      }

      try {
        const response =
          await axios.get(
            directUrl,
            {
              responseType:
                "stream",

              timeout:
                120000,

              maxRedirects: 10,

              headers:
                INSTAGRAM_HEADERS,
            }
          );

        const contentType =
          response.headers[
            "content-type"
          ] ||
          (isPhoto
            ? "image/jpeg"
            : "video/mp4");

        const isImage =
          contentType.startsWith(
            "image/"
          );

        const extension =
          getExtensionFromContentType(
            contentType,
            isImage
              ? "jpg"
              : "mp4"
          );

        const finalName =
          `${cleanBaseTitle}.${extension}`;

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
            finalName
          )}"`
        );

        res.setHeader(
          "Cache-Control",
          "no-store, no-cache, must-revalidate"
        );

        res.setHeader(
          "Pragma",
          "no-cache"
        );

        response.data.pipe(res);

        return;
      } catch (instagramError) {
        logger?.error?.(
          `Instagram download failed: ${instagramError.message}`
        );

        return res.status(502).json({
          success: false,

          message:
            "Instagram download failed. The media may be private, expired, or unavailable. Please extract the public URL again and try once more.",
        });
      }
    }

    /* =====================================================
       FACEBOOK
    ===================================================== */

    if (
      platform ===
      "facebook"
    ) {
      const targetDirectUrl =
        directUrl ||
        null;

      if (
        targetDirectUrl &&
        validateUrl(
          targetDirectUrl
        )
      ) {
        try {
          const streamRes =
            await axios({
              method: "GET",

              url:
                targetDirectUrl,

              responseType:
                "stream",

              timeout:
                120000,

              maxRedirects: 10,

              headers:
                FACEBOOK_HEADERS,
            });

          const contentType =
            streamRes.headers[
              "content-type"
            ] ||
            "video/mp4";

          let ext =
            contentType.includes(
              "webm"
            )
              ? ".webm"
              : ".mp4";

          const finalName =
            `${cleanBaseTitle}${ext}`;

          res.status(200);

          res.setHeader(
            "Content-Type",
            contentType
          );

          if (
            streamRes.headers[
              "content-length"
            ]
          ) {
            res.setHeader(
              "Content-Length",
              streamRes.headers[
                "content-length"
              ]
            );
          }

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

          return streamRes.data.pipe(
            res
          );
        } catch (streamErr) {
          logger?.warn?.(
            `Facebook direct stream failed: ${streamErr.message}`
          );
        }
      }

      return res.status(422).json({
        success: false,

        message:
          "Facebook video download is currently unavailable. Please extract the link again.",
      });
    }

    /* =====================================================
       YOUTUBE
    ===================================================== */

    if (
      platform ===
      "youtube"
    ) {
      const videoId =
        extractYouTubeId(
          sourceUrl
        );

      if (!videoId) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid YouTube video URL.",
        });
      }

      /*
       * Only 360 and 720.
       */
      const requestedQuality =
        Number(quality) === 720
          ? 720
          : 360;

      /*
       * Get fresh stream.
       */
      const stream =
        await getYouTubeStreamFromInvidious(
          videoId,
          requestedQuality
        );

      if (
        !stream?.url
      ) {
        return res.status(503).json({
          success: false,

          message:
            "YouTube video stream is currently unavailable. Please try again after a few seconds.",
        });
      }

      try {
        /*
         * Fetch actual stream.
         */
        const response =
          await axios.get(
            stream.url,
            {
              responseType:
                "stream",

              timeout:
                120000,

              maxRedirects: 10,

              headers:
                YOUTUBE_HEADERS,
            }
          );

        /*
         * IMPORTANT:
         * Do not force video/mp4 blindly.
         */
        const actualContentType =
          response.headers[
            "content-type"
          ] ||
          stream.type ||
          "video/mp4";

        /*
         * YouTube stream must be video.
         */
        if (
          !actualContentType.startsWith(
            "video/"
          )
        ) {
          logger?.warn?.(
            `YouTube returned unexpected content type: ${actualContentType}`
          );

          return res.status(502).json({
            success: false,

            message:
              "YouTube returned an unsupported media format. Please try another quality.",
          });
        }

        const extension =
          getExtensionFromContentType(
            actualContentType,
            "mp4"
          );

        const finalName =
          `${cleanBaseTitle}-${stream.height || requestedQuality}p.${extension}`;

        res.status(200);

        /*
         * Use actual MIME type.
         */
        res.setHeader(
          "Content-Type",
          actualContentType
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
            finalName
          )}"`
        );

        res.setHeader(
          "Cache-Control",
          "no-store, no-cache, must-revalidate"
        );

        res.setHeader(
          "Pragma",
          "no-cache"
        );

        response.data.pipe(res);

        return;
      } catch (youtubeStreamError) {
        logger?.error?.(
          `YouTube stream failed: ${youtubeStreamError.message}`
        );

        return res.status(502).json({
          success: false,

          message:
            "YouTube download stream expired or is unavailable. Please extract the video again and retry.",
        });
      }
    }

    /* =====================================================
       UNKNOWN
    ===================================================== */

    return res.status(400).json({
      success: false,

      message:
        "Unsupported downloader.",
    });
  } catch (error) {
    logger?.error?.(
      `DOWNLOAD ERROR: ${error.message}`
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to download media. Please try again.",
    });
  }
};
