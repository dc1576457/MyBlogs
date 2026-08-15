import axios from "axios";
import crypto from "crypto";
import youtubedl from "youtube-dl-exec";

/* =========================================================
   CONSTANTS
========================================================= */

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
  "AppleWebKit/537.36 " +
  "(KHTML, like Gecko) " +
  "Chrome/151.0.0.0 Safari/537.36";

const METADATA_TIMEOUT = 30000;
const DOWNLOAD_TIMEOUT = 120000;

const SUPPORTED_TOOLS = [
  "youtube-video-downloader",
  "facebook-video-downloader",
  "instagram-video-downloader",
  "pinterest-downloader",
];

/* =========================================================
   HELPERS
========================================================= */

const createId = () => {
  return crypto
    .randomBytes(8)
    .toString("hex");
};

const normalizeHostname = (value) => {
  try {
    const parsed = new URL(value);

    return parsed.hostname
      .toLowerCase()
      .replace(/^www\./, "");
  } catch {
    return "";
  }
};

const cleanUrl = (value) => {
  if (!value) return null;

  return String(value)
    .replace(/\\u0026/g, "&")
    .replace(/\\u002F/g, "/")
    .replace(/\\\//g, "/")
    .replace(/\\/g, "")
    .replace(/&amp;/g, "&")
    .trim();
};

const isValidHttpUrl = (value) => {
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
   PLATFORM URL CHECKS
========================================================= */

const isYouTubeUrl = (url) => {
  const hostname =
    normalizeHostname(url);

  return (
    hostname === "youtube.com" ||
    hostname === "m.youtube.com" ||
    hostname === "youtu.be"
  );
};

const isInstagramUrl = (url) => {
  const hostname =
    normalizeHostname(url);

  return (
    hostname === "instagram.com" ||
    hostname === "m.instagram.com" ||
    hostname.endsWith(".instagram.com")
  );
};

const isFacebookUrl = (url) => {
  const hostname =
    normalizeHostname(url);

  return (
    hostname === "facebook.com" ||
    hostname === "m.facebook.com" ||
    hostname === "fb.watch" ||
    hostname.endsWith(".facebook.com")
  );
};

const isPinterestUrl = (url) => {
  const hostname =
    normalizeHostname(url);

  return (
    hostname === "pinterest.com" ||
    hostname === "m.pinterest.com" ||
    hostname === "pin.it" ||
    hostname.endsWith(".pinterest.com")
  );
};

/* =========================================================
   YOUTUBE VIDEO ID
========================================================= */

const getYouTubeVideoId = (url) => {
  try {
    const parsed =
      new URL(url);

    if (
      parsed.hostname ===
        "youtu.be" ||
      parsed.hostname ===
        "www.youtu.be"
    ) {
      return parsed.pathname
        .replace("/", "")
        .split("/")[0];
    }

    const queryId =
      parsed.searchParams.get("v");

    if (queryId) {
      return queryId;
    }

    const match =
      parsed.pathname.match(
        /\/(?:embed|shorts|live)\/([^/?]+)/
      );

    return match?.[1] || null;
  } catch {
    return null;
  }
};

/* =========================================================
   YOUTUBE EXTRACTION
========================================================= */

const extractYouTubeData = async (
  url
) => {
  try {
    console.log(
      "yt-dlp extracting:",
      url
    );

    const data =
      await youtubedl(
        url,
        {
          dumpSingleJson: true,

          noWarnings: true,

          noCallHome: true,

          noCheckCertificates: true,

          preferFreeFormats: true,

          skipDownload: true,

          noPlaylist: true,

          addHeader: [
            `user-agent:${USER_AGENT}`,
          ],
        },
        {
          timeout:
            METADATA_TIMEOUT,
        }
      );

    const formats =
      Array.isArray(data?.formats)
        ? data.formats
        : [];

    /*
     * Get video formats.
     *
     * We keep formats that have video.
     */
    const videoFormats =
      formats
        .filter(
          (format) =>
            format?.vcodec &&
            format.vcodec !== "none" &&
            Number(format.height) > 0
        )
        .sort(
          (a, b) =>
            Number(b.height || 0) -
            Number(a.height || 0)
        );

    /*
     * Remove duplicate resolutions.
     */
    const uniqueFormats = [];

    const seenHeights =
      new Set();

    for (const format of videoFormats) {
      const height =
        Number(format.height);

      if (!height) continue;

      if (
        seenHeights.has(height)
      ) {
        continue;
      }

      seenHeights.add(height);

      uniqueFormats.push({
        height,
        width:
          Number(format.width) ||
          null,

        ext:
          format.ext ||
          "mp4",

        formatId:
          format.format_id ||
          null,

        fps:
          Number(format.fps) ||
          null,

        filesize:
          format.filesize ||
          format.filesize_approx ||
          null,
      });
    }

    /*
     * Limit to useful resolutions.
     */
    const usefulFormats =
      uniqueFormats
        .filter((format) =>
          [144, 240, 360, 480, 576, 720, 1080, 1440, 2160]
            .includes(format.height)
        )
        .slice(0, 8);

    /*
     * If filtering removed everything,
     * use the first available formats.
     */
    const finalFormats =
      usefulFormats.length
        ? usefulFormats
        : uniqueFormats.slice(
            0,
            8
          );

    const videoId =
      getYouTubeVideoId(url);

    const thumbnail =
      data?.thumbnail ||
      (videoId
        ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
        : null);

    return {
      id:
        data?.id ||
        videoId ||
        createId(),

      title:
        data?.title ||
        "YouTube Video",

      thumbnail,

      uploader:
        data?.uploader ||
        data?.channel ||
        "YouTube",

      webpageUrl:
        data?.webpage_url ||
        url,

      duration:
        Number(data?.duration) ||
        0,

      formats: finalFormats,
    };
  } catch (error) {
    console.error(
      "YouTube yt-dlp error:",
      error?.stderr ||
        error?.message ||
        error
    );

    throw new Error(
      "Unable to extract YouTube video information."
    );
  }
};

/* =========================================================
   YOUTUBE FORMAT
========================================================= */

const getYouTubeFormat = (
  formats,
  quality
) => {
  const requested =
    Number(quality) || 720;

  /*
   * Prefer MP4 video + M4A audio.
   *
   * If no exact quality exists,
   * choose the highest available <= requested.
   */
  const candidates =
    Array.isArray(formats)
      ? formats
      : [];

  const withVideo =
    candidates.filter(
      (format) =>
        format?.vcodec &&
        format.vcodec !== "none" &&
        Number(format.height) > 0
    );

  if (!withVideo.length) {
    return null;
  }

  const belowOrEqual =
    withVideo
      .filter(
        (format) =>
          Number(format.height) <=
          requested
      )
      .sort(
        (a, b) =>
          Number(b.height) -
          Number(a.height)
      );

  if (
    belowOrEqual.length
  ) {
    return belowOrEqual[0];
  }

  return withVideo.sort(
    (a, b) =>
      Number(a.height) -
      Number(b.height)
  )[0];
};

/* =========================================================
   INSTAGRAM EXTRACTION
========================================================= */

const extractInstagramData = async (
  url
) => {
  try {
    const match =
      url.match(
        /(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/
      );

    if (!match) {
      throw new Error(
        "Invalid Instagram post/reel URL."
      );
    }

    const shortcode =
      match[1];

    const embedUrl =
      `https://www.instagram.com/p/${shortcode}/embed/`;

    const response =
      await axios.get(
        embedUrl,
        {
          headers: {
            "User-Agent":
              USER_AGENT,

            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          },

          timeout:
            METADATA_TIMEOUT,
        }
      );

    const html =
      String(response.data);

    const videoMatch =
      html.match(
        /"video_url"\s*:\s*"([^"]+)"/i
      ) ||
      html.match(
        /<video[^>]+src=["']([^"']+)["']/i
      );

    const imageMatch =
      html.match(
        /"display_url"\s*:\s*"([^"]+)"/i
      ) ||
      html.match(
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
      );

    const titleMatch =
      html.match(
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
      );

    const videoUrl =
      cleanUrl(
        videoMatch?.[1]
      );

    const imageUrl =
      cleanUrl(
        imageMatch?.[1]
      );

    const title =
      titleMatch?.[1] ||
      "Instagram Media";

    if (
      videoUrl &&
      isValidHttpUrl(videoUrl)
    ) {
      return {
        id: shortcode,

        title,

        thumbnail: imageUrl,

        uploader: "Instagram",

        webpageUrl: url,

        formats: [
          {
            height: 1080,
            label: "HD Video",
            directUrl: videoUrl,
          },
          {
            height: 720,
            label: "720p Video",
            directUrl: videoUrl,
          },
          {
            height: 480,
            label: "480p Video",
            directUrl: videoUrl,
          },
          {
            height: 360,
            label: "360p Video",
            directUrl: videoUrl,
          },
        ],
      };
    }

    if (
      imageUrl &&
      isValidHttpUrl(imageUrl)
    ) {
      return {
        id: shortcode,

        title:
          "Instagram Photo",

        thumbnail: imageUrl,

        uploader: "Instagram",

        webpageUrl: url,

        isPhoto: true,

        formats: [
          {
            height: 1080,
            label:
              "High Quality Photo",
            directUrl: imageUrl,
          },
        ],
      };
    }

    throw new Error(
      "No public Instagram media found."
    );
  } catch (error) {
    console.error(
      "Instagram error:",
      error?.message
    );

    throw new Error(
      "Unable to extract Instagram media. Make sure the post or reel is public."
    );
  }
};

/* =========================================================
   FACEBOOK EXTRACTION
========================================================= */

const extractFacebookData = async (
  url
) => {
  try {
    const embedUrl =
      `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
        url
      )}&show_text=false`;

    const response =
      await axios.get(
        embedUrl,
        {
          headers: {
            "User-Agent":
              USER_AGENT,

            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          },

          timeout:
            METADATA_TIMEOUT,
        }
      );

    const html =
      String(response.data);

    const hdMatch =
      html.match(
        /hd_src\s*:\s*"([^"]+)"/i
      ) ||
      html.match(
        /"hd_src_no_ratelimit"\s*:\s*"([^"]+)"/i
      );

    const sdMatch =
      html.match(
        /sd_src\s*:\s*"([^"]+)"/i
      ) ||
      html.match(
        /"sd_src_no_ratelimit"\s*:\s*"([^"]+)"/i
      );

    const thumbnailMatch =
      html.match(
        /thumbnail_src\s*:\s*"([^"]+)"/i
      ) ||
      html.match(
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
      );

    const hdUrl =
      cleanUrl(
        hdMatch?.[1]
      );

    const sdUrl =
      cleanUrl(
        sdMatch?.[1]
      );

    const thumbnail =
      cleanUrl(
        thumbnailMatch?.[1]
      );

    const videoUrl =
      hdUrl || sdUrl;

    if (
      !videoUrl ||
      !isValidHttpUrl(videoUrl)
    ) {
      throw new Error(
        "Facebook video URL not found."
      );
    }

    return {
      id: createId(),

      title: "Facebook Video",

      thumbnail,

      uploader: "Facebook",

      webpageUrl: url,

      formats: [
        {
          height: 1080,
          label: "HD Quality",
          directUrl:
            hdUrl || videoUrl,
        },
        {
          height: 720,
          label: "720p Quality",
          directUrl:
            sdUrl || videoUrl,
        },
        {
          height: 480,
          label: "480p Quality",
          directUrl:
            sdUrl || videoUrl,
        },
        {
          height: 360,
          label: "360p Quality",
          directUrl:
            sdUrl || videoUrl,
        },
      ],
    };
  } catch (error) {
    console.error(
      "Facebook error:",
      error?.message
    );

    throw new Error(
      "Unable to extract Facebook video. Make sure the video is public."
    );
  }
};

/* =========================================================
   PINTEREST EXTRACTION
========================================================= */

const extractPinterestData =
  async (url) => {
    try {
      let targetUrl = url;

      /*
       * Resolve pin.it short URL.
       */
      if (
        normalizeHostname(url) ===
        "pin.it"
      ) {
        try {
          const redirectResponse =
            await axios.get(
              url,
              {
                headers: {
                  "User-Agent":
                    USER_AGENT,
                },

                maxRedirects: 10,

                timeout: 10000,
              }
            );

          targetUrl =
            redirectResponse
              ?.request
              ?.res
              ?.responseUrl ||
            redirectResponse
              ?.request
              ?.res
              ?.responseUrl ||
            url;
        } catch {
          targetUrl = url;
        }
      }

      const response =
        await axios.get(
          targetUrl,
          {
            headers: {
              "User-Agent":
                USER_AGENT,

              Accept:
                "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            },

            timeout:
              METADATA_TIMEOUT,
          }
        );

      const html =
        String(response.data);

      const videoMatch =
        html.match(
          /<meta[^>]+property=["']og:video["'][^>]+content=["']([^"']+)["']/i
        ) ||
        html.match(
          /<meta[^>]+property=["']og:video:secure_url["'][^>]+content=["']([^"']+)["']/i
        ) ||
        html.match(
          /<video[^>]+src=["']([^"']+)["']/i
        ) ||
        html.match(
          /"url"\s*:\s*"([^"]+\.mp4[^"]*)"/i
        );

      const imageMatch =
        html.match(
          /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
        ) ||
        html.match(
          /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i
        );

      const titleMatch =
        html.match(
          /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
        ) ||
        html.match(
          /<title[^>]*>([^<]+)<\/title>/i
        );

      const videoUrl =
        cleanUrl(
          videoMatch?.[1]
        );

      let imageUrl =
        cleanUrl(
          imageMatch?.[1]
        );

      if (imageUrl) {
        imageUrl =
          imageUrl
            .replace(
              "/236x/",
              "/originals/"
            )
            .replace(
              "/474x/",
              "/originals/"
            )
            .replace(
              "/736x/",
              "/originals/"
            );
      }

      const title =
        titleMatch?.[1]
          ?.replace(
            /\s*\|\s*Pinterest\s*$/i,
            ""
          )
          ?.trim() ||
        "Pinterest Media";

      if (
        videoUrl &&
        isValidHttpUrl(videoUrl)
      ) {
        return {
          id: createId(),

          title,

          thumbnail:
            imageUrl,

          uploader:
            "Pinterest",

          webpageUrl:
            targetUrl,

          formats: [
            {
              height: 1080,
              label: "HD Video",
              directUrl:
                videoUrl,
            },
            {
              height: 720,
              label: "720p Video",
              directUrl:
                videoUrl,
            },
            {
              height: 480,
              label: "480p Video",
              directUrl:
                videoUrl,
            },
            {
              height: 360,
              label: "360p Video",
              directUrl:
                videoUrl,
            },
          ],
        };
      }

      if (
        imageUrl &&
        isValidHttpUrl(imageUrl)
      ) {
        return {
          id: createId(),

          title,

          thumbnail:
            imageUrl,

          uploader:
            "Pinterest",

          webpageUrl:
            targetUrl,

          isPhoto: true,

          formats: [
            {
              height: 1080,
              label:
                "Original High-Res Photo",
              directUrl:
                imageUrl,
            },
          ],
        };
      }

      throw new Error(
        "Pinterest media not found."
      );
    } catch (error) {
      console.error(
        "Pinterest error:",
        error?.message
      );

      throw new Error(
        "Unable to extract Pinterest media. Make sure the pin is public."
      );
    }
  };

/* =========================================================
   EXTRACT CONTROLLER
========================================================= */

export const extractTool =
  async (req, res) => {
    try {
      const {
        tool,
        url,
      } = req.body || {};

      /*
       * Validation
       */
      if (!tool || !url) {
        return res.status(400).json({
          success: false,
          message:
            "Tool and URL are required.",
        });
      }

      if (
        !SUPPORTED_TOOLS.includes(
          tool
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Unsupported tool.",
        });
      }

      const targetUrl =
        String(url).trim();

      if (
        !isValidHttpUrl(
          targetUrl
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please provide a valid HTTP or HTTPS URL.",
        });
      }

      /*
       * YouTube
       */
      if (
        tool ===
        "youtube-video-downloader"
      ) {
        if (
          !isYouTubeUrl(
            targetUrl
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Please provide a valid YouTube URL.",
          });
        }

        const data =
          await extractYouTubeData(
            targetUrl
          );

        return res.status(200).json({
          success: true,
          data,
        });
      }

      /*
       * Instagram
       */
      if (
        tool ===
        "instagram-video-downloader"
      ) {
        if (
          !isInstagramUrl(
            targetUrl
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Please provide a valid Instagram URL.",
          });
        }

        const data =
          await extractInstagramData(
            targetUrl
          );

        return res.status(200).json({
          success: true,
          data,
        });
      }

      /*
       * Facebook
       */
      if (
        tool ===
        "facebook-video-downloader"
      ) {
        if (
          !isFacebookUrl(
            targetUrl
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Please provide a valid Facebook URL.",
          });
        }

        const data =
          await extractFacebookData(
            targetUrl
          );

        return res.status(200).json({
          success: true,
          data,
        });
      }

      /*
       * Pinterest
       */
      if (
        tool ===
        "pinterest-downloader"
      ) {
        if (
          !isPinterestUrl(
            targetUrl
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Please provide a valid Pinterest URL.",
          });
        }

        const data =
          await extractPinterestData(
            targetUrl
          );

        return res.status(200).json({
          success: true,
          data,
        });
      }

      return res.status(400).json({
        success: false,
        message:
          "Unsupported tool.",
      });
    } catch (error) {
      console.error(
        "EXTRACT TOOL ERROR:",
        error
      );

      return res.status(502).json({
        success: false,
        message:
          error?.message ||
          "Failed to extract media.",
      });
    }
  };

/* =========================================================
   YOUTUBE DOWNLOAD
========================================================= */

const downloadYouTube =
  async (
    url,
    quality
  ) => {
    const requested =
      Number(quality) || 720;

    /*
     * Format selection:
     *
     * Best MP4 video <= requested
     * + best M4A audio
     *
     * Fallback to best available.
     */
    const format =
      `bestvideo[height<=${requested}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${requested}][ext=mp4]/best[height<=${requested}]/best`;

    console.log(
      "YouTube download format:",
      format
    );

    const subprocess =
      youtubedl.exec(
        url,
        {
          format,

          output: "-",

          noWarnings: true,

          noCallHome: true,

          noCheckCertificates: true,

          noPlaylist: true,

          addHeader: [
            `user-agent:${USER_AGENT}`,
          ],
        },
        {
          timeout:
            DOWNLOAD_TIMEOUT,
        }
      );

    return subprocess;
  };

/* =========================================================
   PROXY DOWNLOAD
========================================================= */

const proxyRemoteMedia =
  async (
    mediaUrl,
    req,
    res
  ) => {
    if (
      !mediaUrl ||
      !isValidHttpUrl(
        mediaUrl
      )
    ) {
      throw new Error(
        "Invalid media URL."
      );
    }

    const response =
      await axios.get(
        mediaUrl,
        {
          responseType:
            "stream",

          headers: {
            "User-Agent":
              USER_AGENT,

            Accept: "*/*",
          },

          timeout:
            DOWNLOAD_TIMEOUT,

          maxRedirects: 10,

          validateStatus:
            (status) =>
              status >= 200 &&
              status < 400,
        }
      );

    const contentType =
      response.headers[
        "content-type"
      ] ||
      "application/octet-stream";

    const contentLength =
      response.headers[
        "content-length"
      ];

    let extension = "mp4";

    if (
      contentType.includes(
        "image/jpeg"
      )
    ) {
      extension = "jpg";
    } else if (
      contentType.includes(
        "image/png"
      )
    ) {
      extension = "png";
    } else if (
      contentType.includes(
        "image/webp"
      )
    ) {
      extension = "webp";
    } else if (
      contentType.includes(
        "video/webm"
      )
    ) {
      extension = "webm";
    }

    const filename =
      `media-${Date.now()}.${extension}`;

    res.status(200);

    res.setHeader(
      "Content-Type",
      contentType
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    res.setHeader(
      "Cache-Control",
      "no-store"
    );

    res.setHeader(
      "Access-Control-Expose-Headers",
      "Content-Disposition, Content-Length, Content-Type"
    );

    if (contentLength) {
      res.setHeader(
        "Content-Length",
        contentLength
      );
    }

    response.data.on(
      "error",
      (error) => {
        console.error(
          "Remote media stream error:",
          error?.message
        );

        if (!res.headersSent) {
          res.status(502).json({
            success: false,
            message:
              "Media stream failed.",
          });
        } else {
          res.destroy(error);
        }
      }
    );

    response.data.pipe(res);
  };

/* =========================================================
   DOWNLOAD CONTROLLER
========================================================= */

export const downloadTool =
  async (req, res) => {
    try {
      const {
        tool,
        url,
        quality,
        directUrl,
      } = req.body || {};

      /*
       * Validation
       */
      if (!tool || !url) {
        return res.status(400).json({
          success: false,
          message:
            "Tool and URL are required.",
        });
      }

      if (
        !SUPPORTED_TOOLS.includes(
          tool
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Unsupported tool.",
        });
      }

      const targetUrl =
        String(url).trim();

      const selectedQuality =
        Number(quality) || 720;

      /*
       * =====================================================
       * YOUTUBE
       * =====================================================
       */

      if (
        tool ===
        "youtube-video-downloader"
      ) {
        if (
          !isYouTubeUrl(
            targetUrl
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid YouTube URL.",
          });
        }

        console.log(
          `Starting YouTube ${selectedQuality}p download`
        );

        const subprocess =
          await downloadYouTube(
            targetUrl,
            selectedQuality
          );

        const filename =
          `youtube-${selectedQuality}p-${Date.now()}.mp4`;

        res.status(200);

        res.setHeader(
          "Content-Type",
          "video/mp4"
        );

        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`
        );

        res.setHeader(
          "Cache-Control",
          "no-store"
        );

        res.setHeader(
          "Access-Control-Expose-Headers",
          "Content-Disposition, Content-Length, Content-Type"
        );

        /*
         * yt-dlp stdout → browser
         */
        subprocess.stdout.pipe(
          res
        );

        subprocess.stderr.on(
          "data",
          (chunk) => {
            const message =
              chunk
                .toString()
                .trim();

            if (message) {
              console.log(
                "yt-dlp:",
                message
              );
            }
          }
        );

        subprocess.on(
          "error",
          (error) => {
            console.error(
              "yt-dlp process error:",
              error?.message
            );

            if (
              !res.headersSent
            ) {
              res.status(502).json({
                success: false,
                message:
                  "YouTube download process failed.",
              });
            } else {
              res.destroy(error);
            }
          }
        );

        subprocess.stdout.on(
          "error",
          (error) => {
            console.error(
              "YouTube stdout error:",
              error?.message
            );

            if (
              !res.destroyed
            ) {
              res.destroy(error);
            }
          }
        );

        return;
      }

      /*
       * =====================================================
       * INSTAGRAM
       * =====================================================
       */

      if (
        tool ===
        "instagram-video-downloader"
      ) {
        if (
          !isInstagramUrl(
            targetUrl
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid Instagram URL.",
          });
        }

        let mediaUrl =
          typeof directUrl ===
            "string" &&
          isValidHttpUrl(
            directUrl
          )
            ? directUrl
            : null;

        if (!mediaUrl) {
          const data =
            await extractInstagramData(
              targetUrl
            );

          mediaUrl =
            data?.formats?.[0]
              ?.directUrl;
        }

        if (!mediaUrl) {
          return res.status(502).json({
            success: false,
            message:
              "Instagram media URL could not be found.",
          });
        }

        return proxyRemoteMedia(
          mediaUrl,
          req,
          res
        );
      }

      /*
       * =====================================================
       * FACEBOOK
       * =====================================================
       */

      if (
        tool ===
        "facebook-video-downloader"
      ) {
        if (
          !isFacebookUrl(
            targetUrl
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid Facebook URL.",
          });
        }

        let mediaUrl =
          typeof directUrl ===
            "string" &&
          isValidHttpUrl(
            directUrl
          )
            ? directUrl
            : null;

        if (!mediaUrl) {
          const data =
            await extractFacebookData(
              targetUrl
            );

          const selected =
            data?.formats?.find(
              (item) =>
                Number(
                  item.height
                ) ===
                selectedQuality
            );

          mediaUrl =
            selected?.directUrl ||
            data?.formats?.[0]
              ?.directUrl;
        }

        if (!mediaUrl) {
          return res.status(502).json({
            success: false,
            message:
              "Facebook media URL could not be found.",
          });
        }

        return proxyRemoteMedia(
          mediaUrl,
          req,
          res
        );
      }

      /*
       * =====================================================
       * PINTEREST
       * =====================================================
       */

      if (
        tool ===
        "pinterest-downloader"
      ) {
        if (
          !isPinterestUrl(
            targetUrl
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid Pinterest URL.",
          });
        }

        let mediaUrl =
          typeof directUrl ===
            "string" &&
          isValidHttpUrl(
            directUrl
          )
            ? directUrl
            : null;

        if (!mediaUrl) {
          const data =
            await extractPinterestData(
              targetUrl
            );

          const selected =
            data?.formats?.find(
              (item) =>
                Number(
                  item.height
                ) ===
                selectedQuality
            );

          mediaUrl =
            selected?.directUrl ||
            data?.formats?.[0]
              ?.directUrl;
        }

        if (!mediaUrl) {
          return res.status(502).json({
            success: false,
            message:
              "Pinterest media URL could not be found.",
          });
        }

        return proxyRemoteMedia(
          mediaUrl,
          req,
          res
        );
      }

      return res.status(400).json({
        success: false,
        message:
          "Unsupported tool.",
      });
    } catch (error) {
      console.error(
        "DOWNLOAD TOOL ERROR:",
        error?.stderr ||
          error?.message ||
          error
      );

      if (
        res.headersSent
      ) {
        return res.end();
      }

      return res.status(502).json({
        success: false,
        message:
          error?.message ||
          "Download failed. Please try again.",
      });
    }
  };
