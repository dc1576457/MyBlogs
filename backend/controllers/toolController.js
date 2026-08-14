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
   HELPERS
========================================================= */

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/123.0.0.0 Safari/537.36";

/*
 * Keep common options simple.
 *
 * IMPORTANT:
 * We don't force youtube player_client here.
 * Let current yt-dlp choose the appropriate client.
 */
const getCommonOptions = () => ({
  noPlaylist: true,
  noWriteThumbnail: true,
  noWriteSubs: true,
  noCheckCertificates: true,
  restrictFilenames: true,

  retries: 5,
  fragmentRetries: 5,
  concurrentFragments: 4,

  addHeader: [
    `User-Agent:${USER_AGENT}`,
  ],
});

/* =========================================================
   YOUTUBE DOWNLOAD
========================================================= */

const downloadYouTube = async (url, quality, outputTemplate) => {
  /*
   * Prefer a single-file format first.
   *
   * If a combined format is unavailable,
   * yt-dlp will select video + audio and merge
   * them with FFmpeg.
   */
  const format =
    `bv*[height<=${quality}][ext=mp4]+ba[ext=m4a]/` +
    `bv*[height<=${quality}]+ba/` +
    `b[height<=${quality}][ext=mp4]/` +
    `b[height<=${quality}]/` +
    `best`;

  const options = {
    ...getCommonOptions(),

    output: outputTemplate,

    format,

    /*
     * Only tells yt-dlp which container to use
     * when merging is required.
     */
    mergeOutputFormat: "mp4",

    /*
     * Do NOT use remuxVideo here.
     * It can cause unnecessary post-processing.
     */

    /*
     * Let yt-dlp verify that selected formats
     * are actually downloadable.
     */
    checkFormats: true,

    /*
     * Do not keep intermediate files.
     */
    keepVideo: false,
    keepFragments: false,

    /*
     * Important: fail properly if the download
     * actually fails.
     */
    noAbortOnError: false,
  };

  console.log("==========================================");
  console.log("YOUTUBE DOWNLOAD START");
  console.log("URL:", url);
  console.log("QUALITY:", quality);
  console.log("FORMAT:", format);
  console.log("OUTPUT:", outputTemplate);
  console.log("==========================================");

  try {
    await youtubedl(url, options);

    console.log("YOUTUBE DOWNLOAD FINISHED");

    return true;
  } catch (error) {
    console.error("==========================================");
    console.error("YOUTUBE YT-DLP ERROR");
    console.error("MESSAGE:", error?.message);
    console.error("STDERR:", error?.stderr);
    console.error("STDOUT:", error?.stdout);
    console.error("==========================================");

    throw error;
  }
};

/* =========================================================
   DIRECT CDN STREAM
   Instagram / Facebook / Pinterest
========================================================= */

const streamDirectMedia = async (req, res, directUrl, originalUrl, quality) => {
  try {
    console.log("DIRECT MEDIA DOWNLOAD");
    console.log("DIRECT URL:", directUrl);

    const response = await axios({
      method: "GET",
      url: directUrl,
      responseType: "stream",

      headers: {
        "User-Agent": USER_AGENT,
        Referer: originalUrl,
        Accept: "*/*",
      },

      timeout: 60000,

      /*
       * Some CDN servers don't return a normal
       * Content-Length header.
       */
      maxRedirects: 10,

      validateStatus: (status) => status >= 200 && status < 400,
    });

    const contentType =
      response.headers["content-type"] ||
      "video/mp4";

    const isImage =
      contentType.toLowerCase().startsWith("image/");

    const ext = isImage ? "jpg" : "mp4";

    res.status(200);

    res.setHeader(
      "Content-Type",
      contentType
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="media-${quality}p.${ext}"`
    );

    const contentLength =
      response.headers["content-length"];

    if (contentLength) {
      res.setHeader(
        "Content-Length",
        contentLength
      );
    }

    response.data.on("error", (error) => {
      console.error(
        "DIRECT STREAM ERROR:",
        error.message
      );

      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: "Unable to stream media.",
        });
      } else {
        res.destroy(error);
      }
    });

    response.data.pipe(res);

    return true;
  } catch (error) {
    console.error(
      "DIRECT MEDIA ERROR:",
      error?.message
    );

    return false;
  }
};

/* =========================================================
   DOWNLOAD CONTROLLER
========================================================= */

const downloadTool = async (req, res) => {
  try {
    const {
      tool,
      url,
      quality,
      directUrl,
    } = req.body;

    /* -----------------------------------------
       VALIDATION
    ----------------------------------------- */

    if (!tool || !url) {
      return res.status(400).json({
        success: false,
        message: "Tool and URL are required.",
      });
    }

    const cleanUrl = String(url).trim();

    const numericQuality =
      Number(quality) || 720;

    /*
     * Only allow the qualities we expose.
     */
    const allowedQualities = [
      360,
      480,
      720,
      1080,
    ];

    const finalQuality =
      allowedQualities.includes(numericQuality)
        ? numericQuality
        : 720;

    console.log("==========================================");
    console.log("DOWNLOAD REQUEST");
    console.log("TOOL:", tool);
    console.log("URL:", cleanUrl);
    console.log("QUALITY:", finalQuality);
    console.log("HAS DIRECT URL:", Boolean(directUrl));
    console.log("==========================================");

    /* =====================================================
       YOUTUBE
       
       IMPORTANT:
       NEVER use extracted YouTube directUrl here.
       YouTube URLs can expire/change.
       
       Always download from original URL using yt-dlp.
    ===================================================== */

    if (
      tool === "youtube-video-downloader" &&
      isYouTubeUrl(cleanUrl)
    ) {
      const tempDir = path.join(
        os.tmpdir(),
        "mern-tools-videos"
      );

      await fs.promises.mkdir(
        tempDir,
        {
          recursive: true,
        }
      );

      const id = crypto
        .randomBytes(16)
        .toString("hex");

      const outputTemplate = path.join(
        tempDir,
        `${id}.%(ext)s`
      );

      let filePath = null;

      try {
        /*
         * Download using original YouTube URL.
         */
        await downloadYouTube(
          cleanUrl,
          finalQuality,
          outputTemplate
        );

        /*
         * Find the generated file.
         */
        const files =
          await fs.promises.readdir(tempDir);

        console.log(
          "TEMP DIRECTORY FILES:",
          files
        );

        const outputFile =
          files.find((file) => {
            return (
              file.startsWith(id) &&
              /\.(mp4|webm|mkv|mov)$/i.test(file)
            );
          });

        if (!outputFile) {
          throw new Error(
            "yt-dlp finished but no video file was created."
          );
        }

        filePath = path.join(
          tempDir,
          outputFile
        );

        console.log(
          "FINAL FILE:",
          filePath
        );

        /*
         * Check file.
         */
        const stats =
          await fs.promises.stat(filePath);

        if (
          !stats.isFile() ||
          stats.size <= 0
        ) {
          throw new Error(
            "Downloaded video file is empty."
          );
        }

        console.log(
          "FILE SIZE:",
          stats.size
        );

        /*
         * Send file to browser.
         */
        res.status(200);

        res.setHeader(
          "Content-Type",
          "video/mp4"
        );

        res.setHeader(
          "Content-Disposition",
          `attachment; filename="youtube-${finalQuality}p.mp4"`
        );

        res.setHeader(
          "Content-Length",
          stats.size
        );

        /*
         * Stream file.
         */
        const stream =
          fs.createReadStream(filePath);

        let cleaned = false;

        const cleanup = async () => {
          if (cleaned || !filePath) {
            return;
          }

          cleaned = true;

          try {
            await fs.promises.unlink(
              filePath
            );

            console.log(
              "TEMP FILE DELETED:",
              filePath
            );
          } catch (error) {
            /*
             * File may already be deleted.
             */
          }
        };

        stream.on(
          "error",
          async (error) => {
            console.error(
              "FILE STREAM ERROR:",
              error.message
            );

            await cleanup();

            if (!res.headersSent) {
              res.status(500).json({
                success: false,
                message:
                  "Unable to send video file.",
              });
            } else {
              res.destroy(error);
            }
          }
        );

        stream.on(
          "close",
          cleanup
        );

        return stream.pipe(res);

      } catch (error) {
        console.error(
          "=========================================="
        );

        console.error(
          "YOUTUBE DOWNLOAD ERROR"
        );

        console.error(
          "MESSAGE:",
          error?.message
        );

        console.error(
          "STDERR:",
          error?.stderr
        );

        console.error(
          "STDOUT:",
          error?.stdout
        );

        console.error(
          "=========================================="
        );

        /*
         * Cleanup every file belonging to this request.
         */
        try {
          const files =
            await fs.promises.readdir(
              tempDir
            );

          for (const file of files) {
            if (file.startsWith(id)) {
              await fs.promises
                .unlink(
                  path.join(
                    tempDir,
                    file
                  )
                )
                .catch(() => {});
            }
          }
        } catch {}

        if (!res.headersSent) {
          return res.status(500).json({
            success: false,

            /*
             * During development, returning stderr
             * makes the actual yt-dlp problem visible.
             */
            message:
              error?.stderr ||
              error?.message ||
              "YouTube video download failed.",
          });
        }

        return;
      }
    }

    /* =====================================================
       NON-YOUTUBE DIRECT DOWNLOAD
       
       Instagram / Facebook / Pinterest
    ===================================================== */

    if (
      directUrl &&
      typeof directUrl === "string" &&
      /^https?:\/\//i.test(directUrl) &&
      !isYouTubeUrl(cleanUrl)
    ) {
      const streamed =
        await streamDirectMedia(
          req,
          res,
          directUrl,
          cleanUrl,
          finalQuality
        );

      if (streamed) {
        return;
      }

      console.warn(
        "Direct media failed. Trying yt-dlp fallback..."
      );
    }

    /* =====================================================
       GENERAL YT-DLP FALLBACK
    ===================================================== */

    const tempDir = path.join(
      os.tmpdir(),
      "mern-tools-videos"
    );

    await fs.promises.mkdir(
      tempDir,
      {
        recursive: true,
      }
    );

    const id = crypto
      .randomBytes(16)
      .toString("hex");

    const outputTemplate = path.join(
      tempDir,
      `${id}.%(ext)s`
    );

    try {
      const options = {
        ...getCommonOptions(),

        output: outputTemplate,

        format:
          `bv*[height<=${finalQuality}]+ba/` +
          `b[height<=${finalQuality}]/best`,

        mergeOutputFormat: "mp4",

        checkFormats: true,

        keepVideo: false,
        keepFragments: false,

        noAbortOnError: false,
      };

      console.log(
        "GENERAL YT-DLP DOWNLOAD:",
        cleanUrl
      );

      await youtubedl(
        cleanUrl,
        options
      );

      const files =
        await fs.promises.readdir(
          tempDir
        );

      const outputFile =
        files.find(
          (file) =>
            file.startsWith(id) &&
            /\.(mp4|webm|mkv|mov)$/i.test(file)
        );

      if (!outputFile) {
        throw new Error(
          "Download completed but no output video was found."
        );
      }

      const filePath =
        path.join(
          tempDir,
          outputFile
        );

      const stats =
        await fs.promises.stat(
          filePath
        );

      if (stats.size <= 0) {
        throw new Error(
          "Downloaded video is empty."
        );
      }

      res.status(200);

      res.setHeader(
        "Content-Type",
        "video/mp4"
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="video-${finalQuality}p.mp4"`
      );

      res.setHeader(
        "Content-Length",
        stats.size
      );

      const stream =
        fs.createReadStream(filePath);

      const cleanup =
        async () => {
          try {
            await fs.promises.unlink(
              filePath
            );
          } catch {}
        };

      stream.on(
        "error",
        async (error) => {
          console.error(
            "GENERAL FILE STREAM ERROR:",
            error.message
          );

          await cleanup();

          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message:
                "Unable to send video file.",
            });
          } else {
            res.destroy(error);
          }
        }
      );

      stream.on(
        "close",
        cleanup
      );

      return stream.pipe(res);

    } catch (error) {
      console.error(
        "GENERAL DOWNLOAD ERROR:",
        error?.message
      );

      console.error(
        "STDERR:",
        error?.stderr
      );

      try {
        const files =
          await fs.promises.readdir(
            tempDir
          );

        for (const file of files) {
          if (file.startsWith(id)) {
            await fs.promises
              .unlink(
                path.join(
                  tempDir,
                  file
                )
              )
              .catch(() => {});
          }
        }
      } catch {}

      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message:
            error?.stderr ||
            error?.message ||
            "Video download failed.",
        });
      }
    }

  } catch (error) {
    console.error(
      "DOWNLOAD CONTROLLER ERROR:",
      error
    );

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          "Unable to download video.",
      });
    }
  }
};

export {
  downloadTool,
  isYouTubeUrl,
  isFacebookUrl,
  isInstagramUrl,
  isPinterestUrl,
};
