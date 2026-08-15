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
    const parsed = new URL(
      value.trim()
    );

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
   YOUTUBE ID
========================================================= */

const extractYouTubeId = (url) => {
  try {
    const parsed = new URL(url);

    if (
      parsed.hostname
        .replace(/^www\./, "")
        .toLowerCase() ===
      "youtu.be"
    ) {
      return (
        parsed.pathname
          .replace("/", "")
          .slice(0, 11) || null
      );
    }

    const v =
      parsed.searchParams.get("v");

    if (v) {
      return v.slice(0, 11);
    }

    const match =
      parsed.pathname.match(
        /\/(?:shorts|embed|v)\/([^/?]+)/i
      );

    return match
      ? match[1].slice(0, 11)
      : null;
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
   SAFE URL DECODE
========================================================= */

const decodeMediaUrl = (value) => {
  if (!value) return null;

  try {
    let result = String(value);

    result = result.replace(
      /\\u0026/g,
      "&"
    );

    result = result.replace(
      /\\u003D/g,
      "="
    );

    result = result.replace(
      /\\\//g,
      "/"
    );

    result = result.replace(
      /\\"/g,
      '"'
    );

    result = decodeURIComponent(
      result
    );

    return result;
  } catch {
    return value;
  }
};

/* =========================================================
   1. PINTEREST ENGINE
========================================================= */

const scrapePinterest = async (url) => {
  try {
    let targetUrl = url;

    /*
      Resolve pin.it redirect
    */

    if (
      url.includes("pin.it")
    ) {
      try {
        const redirectRes =
          await axios.get(url, {
            headers:
              BROWSER_HEADERS,
            maxRedirects: 5,
            timeout: 10000,
          });

        targetUrl =
          redirectRes.request?.res
            ?.responseUrl || url;
      } catch {
        // Continue with original URL
      }
    }

    const pinIdMatch =
      targetUrl.match(
        /\/pin\/(\d+)/
      );

    const pinId = pinIdMatch
      ? pinIdMatch[1]
      : null;

    /* =====================================================
       PIDGET
    ===================================================== */

    if (pinId) {
      try {
        const pidgetRes =
          await axios.get(
            `https://api.pinterest.com/v3/pidgets/pins/info/?pin_ids=${pinId}`,
            {
              headers:
                BROWSER_HEADERS,
              timeout: 10000,
            }
          );

        const pinData =
          pidgetRes.data?.data
            ?.pins?.[0];

        if (pinData) {
          const title =
            pinData.description ||
            "Pinterest Media";

          const imageUrl =
            pinData.images?.orig
              ?.url ||
            pinData.images?.["736x"]
              ?.url;

          /*
            Check Pinterest video
          */

          const videos =
            pinData.videos
              ?.video_list;

          if (videos) {
            const videoUrl =
              videos.V_720P?.url ||
              videos.V_EXP3?.url ||
              videos.V_HLSV4?.url ||
              Object.values(
                videos
              ).find(
                (item) =>
                  item?.url
              )?.url;

            if (videoUrl) {
              return {
                title: title.slice(
                  0,
                  70
                ),
                thumbnail:
                  imageUrl ||
                  null,
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
          }

          if (imageUrl) {
            return {
              title: title.slice(
                0,
                70
              ),
              thumbnail:
                imageUrl,
              url: imageUrl,
              isPhoto: true,
              formats: [],
            };
          }
        }
      } catch {
        // Fallback below
      }
    }

    /* =====================================================
       HTML SCRAPER
    ===================================================== */

    const res =
      await axios.get(
        targetUrl,
        {
          headers:
            BROWSER_HEADERS,
          timeout: 15000,
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

    /* =====================================================
       PWS DATA
    ===================================================== */

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
              videos.V_720P?.url ||
              videos.V_HLSV4?.url ||
              videos.V_EXP3?.url ||
              Object.values(
                videos
              ).find(
                (item) =>
                  item?.url
              )?.url;
          }
        }
      } catch {
        // Ignore
      }
    }

    /* =====================================================
       MP4 FALLBACK
    ===================================================== */

    if (!videoUrl) {
      const mp4Matches =
        html.match(
          /https:\/\/[^"'\s]+\.pinimg\.com\/videos\/[^"'\s]+\.mp4/g
        );

      if (
        mp4Matches &&
        mp4Matches.length
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
          title.slice(
            0,
            70
          ),

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
              decodeMediaUrl(
                videoUrl
              ),
          },
        ],
      };
    }

    if (imageUrl) {
      return {
        title:
          title.slice(
            0,
            70
          ),

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

const scrapeInstagram = async (
  url
) => {
  try {
    const cleanUrl =
      url
        .split("?")[0]
        .replace(/\/+$/, "");

    let oembedData = null;

    /* =====================================================
       OEMBED
    ===================================================== */

    try {
      const oembedRes =
        await axios.get(
          `https://api.instagram.com/oembed/?url=${encodeURIComponent(
            cleanUrl
          )}`,
          {
            headers:
              BROWSER_HEADERS,
            timeout: 10000,
          }
        );

      oembedData =
        oembedRes.data;
    } catch {
      // Continue
    }

    /* =====================================================
       EMBED PAGE
    ===================================================== */

    let html = "";

    try {
      const embedUrl =
        `${cleanUrl}/embed/captioned/`;

      const res =
        await axios.get(
          embedUrl,
          {
            headers: {
              ...BROWSER_HEADERS,
              Referer:
                "https://www.instagram.com/",
            },
            timeout: 15000,
          }
        );

      html =
        res.data;
    } catch {
      /*
        Try original page
      */

      const res =
        await axios.get(
          cleanUrl,
          {
            headers: {
              ...BROWSER_HEADERS,
              Referer:
                "https://www.instagram.com/",
            },
            timeout: 15000,
          }
        );

      html =
        res.data;
    }

    const $ =
      cheerio.load(html);

    let videoUrl = null;

    let imageUrl =
      oembedData?.thumbnail_url ||
      null;

    const caption =
      oembedData?.title ||
      $("div.Caption")
        .text()
        .trim() ||
      "Instagram Media";

    /* =====================================================
       VIDEO TAG
    ===================================================== */

    const videoTag =
      $("video").attr("src");

    if (videoTag) {
      videoUrl =
        decodeMediaUrl(
          videoTag
        );
    }

    /* =====================================================
       VIDEO URL REGEX
    ===================================================== */

    if (!videoUrl) {
      const videoMatches = [
        html.match(
          /"video_url":"([^"]+)"/i
        ),
        html.match(
          /"playable_url":"([^"]+)"/i
        ),
        html.match(
          /"video_versions":\s*\[\s*\{\s*"type":[^}]*"url":"([^"]+)"/i
        ),
      ];

      for (
        const match of videoMatches
      ) {
        if (
          match &&
          match[1]
        ) {
          videoUrl =
            decodeMediaUrl(
              match[1]
            );
          break;
        }
      }
    }

    /* =====================================================
       IMAGE
    ===================================================== */

    if (!imageUrl) {
      imageUrl =
        $("img.EmbeddedMediaImage")
          .attr("src") ||
        $(
          'meta[property="og:image"]'
        ).attr("content");
    }

    if (!imageUrl) {
      const imgMatch =
        html.match(
          /"display_url":"([^"]+)"/i
        ) ||
        html.match(
          /"thumbnail_src":"([^"]+)"/i
        );

      if (
        imgMatch &&
        imgMatch[1]
      ) {
        imageUrl =
          decodeMediaUrl(
            imgMatch[1]
          );
      }
    }

    /* =====================================================
       INSTAGRAM VIDEO
    ===================================================== */

    if (videoUrl) {
      return {
        title:
          caption.slice(
            0,
            70
          ) ||
          "Instagram Reel",

        thumbnail:
          imageUrl || null,

        isPhoto: false,

        formats: [
          {
            formatId:
              "ig-720",
            quality:
              "720p HD",
            height: 720,
            directUrl:
              videoUrl,
          },
        ],
      };
    }

    /* =====================================================
       INSTAGRAM PHOTO
    ===================================================== */

    if (imageUrl) {
      return {
        title:
          caption.slice(
            0,
            70
          ) ||
          "Instagram Photo",

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
      `Instagram scraper error: ${err.message}`
    );
  }

  return null;
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

    if (
      hdMatch &&
      hdMatch[1]
    ) {
      hdUrl =
        decodeMediaUrl(
          hdMatch[1]
        );
    }

    if (
      sdMatch &&
      sdMatch[1]
    ) {
      sdUrl =
        decodeMediaUrl(
          sdMatch[1]
        );
    }

    /* =====================================================
       OG VIDEO
    ===================================================== */

    if (!sdUrl) {
      sdUrl =
        $(
          'meta[property="og:video"]'
        ).attr("content") ||
        $(
          'meta[property="og:video:secure_url"]'
        ).attr("content");
    }

    /* =====================================================
       FORMATS
    ===================================================== */

    if (
      hdUrl ||
      sdUrl
    ) {
      const formats = [];

      /*
        720
      */

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

      /*
        360
      */

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
          title.slice(
            0,
            70
          ),

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
      extractYouTubeId(url);

    let title =
      "YouTube Video";

    let thumbnail = null;

    let uploader =
      "YouTube Creator";

    /* =====================================================
       OEMBED
    ===================================================== */

    try {
      const oembedRes =
        await axios.get(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(
            url
          )}&format=json`,
          {
            headers:
              BROWSER_HEADERS,
            timeout: 10000,
          }
        );

      title =
        oembedRes.data?.title ||
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
      if (videoId) {
        thumbnail =
          `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }
    }

    /*
      ONLY 360 AND 720
    */

    const formats = [
      {
        formatId: "18",
        quality: "360p SD",
        height: 360,
      },
      {
        formatId: "22",
        quality: "720p HD",
        height: 720,
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
  }

  return null;
};

/* =========================================================
   EXTRACT CONTROLLER
========================================================= */

export const extractTool =
  async (req, res) => {
    try {
      const { url } =
        req.body || {};

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
        platform ===
        "unknown"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Unsupported platform URL.",
        });
      }

      let parsedData =
        null;

      /* ===================================================
         PLATFORM ENGINE
      =================================================== */

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

      /* ===================================================
         SUCCESS
      =================================================== */

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
                  (f) =>
                    Number(
                      f.height
                    )
                )
                .filter(
                  Boolean
                ) || [720, 360],

            formats:
              parsedData.formats ||
              [],
          },
        });
      }

      /* ===================================================
         EXTRACTION FAILED
      =================================================== */

      return res.status(422).json({
        success: false,
        message:
          `Unable to extract ${platform} media. The content may be private, unavailable, or protected.`,
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
   STREAM HELPER
========================================================= */

const streamRemoteFile = async ({
  targetUrl,
  res,
  filename,
  defaultContentType,
  referer,
}) => {
  const headers = {
    ...BROWSER_HEADERS,
  };

  if (referer) {
    headers.Referer =
      referer;
  }

  const streamRes =
    await axios({
      method: "GET",

      url: targetUrl,

      responseType:
        "stream",

      timeout: 180000,

      headers,

      maxRedirects: 8,

      validateStatus: (status) =>
        status >= 200 &&
        status < 400,
    });

  const contentType =
    streamRes.headers[
      "content-type"
    ] ||
    defaultContentType ||
    "application/octet-stream";

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
      filename
    )}"`
  );

  res.setHeader(
    "Cache-Control",
    "no-store"
  );

  return streamRes.data.pipe(
    res
  );
};

/* =========================================================
   YOUTUBE INVIDIOUS DOWNLOAD
========================================================= */

const downloadYouTube =
  async ({
    sourceUrl,
    quality,
    title,
    res,
  }) => {
    const videoId =
      extractYouTubeId(
        sourceUrl
      );

    if (!videoId) {
      throw new Error(
        "Unable to detect YouTube video ID."
      );
    }

    /*
      ONLY 360 OR 720
    */

    const requestedQuality =
      Number(quality) === 360
        ? 360
        : 720;

    /*
      itag:
      18 = 360p MP4
      22 = 720p MP4
    */

    const preferredItag =
      requestedQuality === 360
        ? "18"
        : "22";

    /*
      Try selected quality first.
    */

    const itags =
      requestedQuality === 720
        ? ["22", "18"]
        : ["18"];

    let lastError = null;

    for (
      const instance of
        INVIDIOUS_INSTANCES
    ) {
      for (
        const itag of itags
      ) {
        try {
          /*
            Get actual video stream
          */

          const streamUrl =
            `${instance}/latest_version?id=${encodeURIComponent(
              videoId
            )}&itag=${itag}`;

          const filename =
            `${cleanFileName(
              title
            ) || "youtube-video"}.mp4`;

          await streamRemoteFile({
            targetUrl:
              streamUrl,

            res,

            filename,

            defaultContentType:
              "video/mp4",

            referer:
              "https://www.youtube.com/",
          });

          return true;
        } catch (error) {
          lastError = error;

          logger?.warn?.(
            `YouTube Invidious ${instance} itag ${itag} failed: ${error.message}`
          );
        }
      }
    }

    /*
      No external fallback.
      y2meta removed.
    */

    throw (
      lastError ||
      new Error(
        `Unable to download YouTube video in ${requestedQuality}p.`
      )
    );
  };

/* =========================================================
   DOWNLOAD CONTROLLER
========================================================= */

export const downloadTool =
  async (req, res) => {
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
        platform ===
        "unknown"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Unsupported media platform.",
        });
      }

      ensureTempDirectory();

      const cleanBaseTitle =
        cleanFileName(
          title ||
            `${platform}-media`
        );

      /* =====================================================
         PHOTO DOWNLOAD
      ===================================================== */

      if (
        Boolean(isPhoto)
      ) {
        const targetPhotoUrl =
          directUrl;

        if (
          !targetPhotoUrl ||
          !validateUrl(
            targetPhotoUrl
          )
        ) {
          return res.status(422).json({
            success: false,
            message:
              "Photo source URL is unavailable.",
          });
        }

        try {
          let extension =
            ".jpg";

          const lowerUrl =
            targetPhotoUrl
              .toLowerCase();

          if (
            lowerUrl.includes(
              ".png"
            )
          ) {
            extension =
              ".png";
          } else if (
            lowerUrl.includes(
              ".webp"
            )
          ) {
            extension =
              ".webp";
          }

          const filename =
            `${cleanBaseTitle}${extension}`;

          await streamRemoteFile({
            targetUrl:
              targetPhotoUrl,

            res,

            filename,

            defaultContentType:
              "image/jpeg",

            referer:
              platform ===
              "instagram"
                ? "https://www.instagram.com/"
                : platform ===
                  "pinterest"
                ? "https://www.pinterest.com/"
                : undefined,
          });

          return;
        } catch (photoError) {
          logger?.warn?.(
            `Photo direct stream failed: ${photoError.message}`
          );

          return res.status(502).json({
            success: false,
            message:
              "Unable to download the photo. The media URL may have expired.",
          });
        }
      }

      /* =====================================================
         YOUTUBE
      ===================================================== */

      if (
        platform ===
        "youtube"
      ) {
        try {
          await downloadYouTube({
            sourceUrl,

            quality:
              Number(quality) ===
              360
                ? 360
                : 720,

            title:
              cleanBaseTitle,

            res,
          });

          return;
        } catch (youtubeError) {
          logger?.error?.(
            `YouTube download failed: ${youtubeError.message}`
          );

          return res.status(502).json({
            success: false,
            message:
              "YouTube download is currently unavailable for this video. Please try 360p or try again later.",
          });
        }
      }

      /* =====================================================
         INSTAGRAM / FACEBOOK / PINTEREST
      ===================================================== */

      const targetDirectUrl =
        directUrl;

      if (
        targetDirectUrl &&
        validateUrl(
          targetDirectUrl
        )
      ) {
        try {
          let extension =
            ".mp4";

          const lowerUrl =
            targetDirectUrl
              .toLowerCase();

          if (
            lowerUrl.includes(
              ".jpg"
            ) ||
            lowerUrl.includes(
              ".jpeg"
            )
          ) {
            extension =
              ".jpg";
          } else if (
            lowerUrl.includes(
              ".png"
            )
          ) {
            extension =
              ".png";
          } else if (
            lowerUrl.includes(
              ".webp"
            )
          ) {
            extension =
              ".webp";
          }

          const filename =
            `${cleanBaseTitle}${extension}`;

          let referer;

          if (
            platform ===
            "instagram"
          ) {
            referer =
              "https://www.instagram.com/";
          } else if (
            platform ===
            "facebook"
          ) {
            referer =
              "https://www.facebook.com/";
          } else if (
            platform ===
            "pinterest"
          ) {
            referer =
              "https://www.pinterest.com/";
          }

          await streamRemoteFile({
            targetUrl:
              targetDirectUrl,

            res,

            filename,

            defaultContentType:
              "video/mp4",

            referer,
          });

          return;
        } catch (streamError) {
          logger?.warn?.(
            `${platform} direct stream failed: ${streamError.message}`
          );

          return res.status(502).json({
            success: false,
            message:
              `${platform} media download failed. The media URL may have expired or the post may not be publicly accessible.`,
          });
        }
      }

      /* =====================================================
         NO DIRECT URL
      ===================================================== */

      return res.status(422).json({
        success: false,
        message:
          `No downloadable ${platform} media URL was found.`,
      });
    } catch (error) {
      logger?.error?.(
        `DOWNLOAD ERROR: ${error.message}`
      );

      if (
        !res.headersSent
      ) {
        return res.status(500).json({
          success: false,
          message:
            "Failed to download media. Please try again.",
        });
      }
    }
  };
