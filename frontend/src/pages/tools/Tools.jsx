import React, { useMemo, useState } from "react";
import axios from "axios";

/* =========================================================
   API CONFIG
========================================================= */

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://myblogs-fr9t.onrender.com/api";

/*
  IMPORTANT:

  VITE_API_URL should be:

  https://myblogs-fr9t.onrender.com/api

  NOT:

  https://myblogs-fr9t.onrender.com/api/

  Both can work, but this component removes trailing slashes
  automatically.
*/

const API_BASE_URL = API_URL.replace(/\/+$/, "");

/* =========================================================
   TOOLS DATA
========================================================= */

const toolsData = [
  {
    id: 1,
    name: "YouTube Video Downloader",
    slug: "youtube-video-downloader",
    description:
      "Extract available video qualities and download public YouTube videos.",
    category: "YouTube",
    icon: "▶",
    gradient: "from-red-500 via-rose-500 to-pink-600",
    badgeColor:
      "bg-red-500/10 text-red-400 border-red-500/20",
  },

  {
    id: 2,
    name: "Facebook Video Downloader",
    slug: "facebook-video-downloader",
    description:
      "Download publicly accessible Facebook videos in HD and SD.",
    category: "Facebook",
    icon: "f",
    gradient:
      "from-blue-500 via-indigo-500 to-cyan-500",
    badgeColor:
      "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },

  {
    id: 3,
    name: "Instagram Downloader",
    slug: "instagram-video-downloader",
    description:
      "Download publicly accessible Instagram Reels, videos, and photos.",
    category: "Instagram",
    icon: "◎",
    gradient:
      "from-fuchsia-500 via-pink-500 to-orange-400",
    badgeColor:
      "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20",
  },

  {
    id: 4,
    name: "Pinterest Video & Photo Downloader",
    slug: "pinterest-downloader",
    description:
      "Download public Pinterest videos and high-resolution photos instantly.",
    category: "Pinterest",
    icon: "P",
    gradient:
      "from-red-600 via-rose-600 to-red-500",
    badgeColor:
      "bg-red-600/10 text-red-400 border-red-600/20",
  },
];

/* =========================================================
   CATEGORIES
========================================================= */

const categories = [
  "All",
  "YouTube",
  "Facebook",
  "Instagram",
  "Pinterest",
];

/* =========================================================
   QUALITY OPTIONS
========================================================= */

const QUALITY_OPTIONS = [
  {
    value: 360,
    label: "360p",
  },
  {
    value: 480,
    label: "480p",
  },
  {
    value: 720,
    label: "720p HD",
  },
  {
    value: 1080,
    label: "1080p Full HD",
  },
];

/* =========================================================
   URL VALIDATION
========================================================= */

const validatePlatformUrl = (
  value,
  slug
) => {
  try {
    if (!value?.trim()) {
      return false;
    }

    const parsed = new URL(
      value.trim()
    );

    const hostname = parsed.hostname
      .toLowerCase()
      .replace(/^www\./, "");

    /* -----------------------------------------
       YOUTUBE
    ----------------------------------------- */

    if (
      slug ===
      "youtube-video-downloader"
    ) {
      return (
        hostname === "youtube.com" ||
        hostname === "m.youtube.com" ||
        hostname === "youtu.be" ||
        hostname.endsWith(
          ".youtube.com"
        )
      );
    }

    /* -----------------------------------------
       FACEBOOK
    ----------------------------------------- */

    if (
      slug ===
      "facebook-video-downloader"
    ) {
      return (
        hostname === "facebook.com" ||
        hostname === "m.facebook.com" ||
        hostname === "fb.watch" ||
        hostname.endsWith(
          ".facebook.com"
        )
      );
    }

    /* -----------------------------------------
       INSTAGRAM
    ----------------------------------------- */

    if (
      slug ===
      "instagram-video-downloader"
    ) {
      return (
        hostname === "instagram.com" ||
        hostname === "m.instagram.com" ||
        hostname.endsWith(
          ".instagram.com"
        )
      );
    }

    /* -----------------------------------------
       PINTEREST
    ----------------------------------------- */

    if (
      slug ===
      "pinterest-downloader"
    ) {
      return (
        hostname === "pinterest.com" ||
        hostname === "m.pinterest.com" ||
        hostname === "pin.it" ||
        hostname.endsWith(
          ".pinterest.com"
        )
      );
    }

    return false;
  } catch {
    return false;
  }
};

/* =========================================================
   FORMAT BYTES
========================================================= */

const formatBytes = (bytes) => {
  if (
    bytes === undefined ||
    bytes === null ||
    Number.isNaN(Number(bytes))
  ) {
    return "Size unknown";
  }

  const value = Number(bytes);

  if (value <= 0) {
    return "Size unknown";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(
      value / 1024
    ).toFixed(1)} KB`;
  }

  if (
    value <
    1024 * 1024 * 1024
  ) {
    return `${(
      value /
      1024 /
      1024
    ).toFixed(1)} MB`;
  }

  return `${(
    value /
    1024 /
    1024 /
    1024
  ).toFixed(2)} GB`;
};

/* =========================================================
   GET FILENAME FROM CONTENT-DISPOSITION
========================================================= */

const getFilenameFromHeaders = (
  headers,
  fallback
) => {
  try {
    const disposition =
      headers?.["content-disposition"];

    if (!disposition) {
      return fallback;
    }

    /*
      filename*=UTF-8''filename.mp4
    */

    const utfMatch =
      disposition.match(
        /filename\*=UTF-8''([^;]+)/i
      );

    if (utfMatch?.[1]) {
      return decodeURIComponent(
        utfMatch[1]
      );
    }

    /*
      filename="filename.mp4"
    */

    const normalMatch =
      disposition.match(
        /filename="?([^"]+)"?/i
      );

    if (normalMatch?.[1]) {
      return normalMatch[1];
    }

    return fallback;
  } catch {
    return fallback;
  }
};

/* =========================================================
   READ AXIOS ERROR
========================================================= */

const getAxiosErrorMessage = async (
  error
) => {
  /*
    Normal JSON response
  */

  if (
    error?.response?.data &&
    typeof error.response.data ===
      "object" &&
    !(error.response.data instanceof Blob)
  ) {
    return (
      error.response.data.message ||
      error.response.data.error ||
      "Request failed."
    );
  }

  /*
    Backend error may arrive as Blob because
    download request uses responseType: blob.
  */

  if (
    error?.response?.data instanceof Blob
  ) {
    try {
      const text =
        await error.response.data.text();

      if (text) {
        try {
          const json =
            JSON.parse(text);

          return (
            json?.message ||
            json?.error ||
            text
          );
        } catch {
          return text;
        }
      }
    } catch {
      // Ignore blob parsing error.
    }
  }

  if (
    error?.code ===
    "ECONNABORTED"
  ) {
    return "Request timed out. Please try again.";
  }

  if (
    error?.message?.toLowerCase()
      .includes("network error")
  ) {
    return "Network error. Please check your internet connection and try again.";
  }

  return (
    error?.message ||
    "Something went wrong."
  );
};

/* =========================================================
   COMPONENT
========================================================= */

function Tools() {
  /* =======================================================
     FILTER STATE
  ======================================================= */

  const [search, setSearch] =
    useState("");

  const [category, setCategory] =
    useState("All");

  /* =======================================================
     TOOL STATE
  ======================================================= */

  const [activeTool, setActiveTool] =
    useState(null);

  const [inputValue, setInputValue] =
    useState("");

  /* =======================================================
     PROCESSING STATE
  ======================================================= */

  const [isExtracting, setIsExtracting] =
    useState(false);

  const [isDownloading, setIsDownloading] =
    useState(false);

  const [progress, setProgress] =
    useState(0);

  /* =======================================================
     RESULT STATE
  ======================================================= */

  const [error, setError] =
    useState("");

  const [videoInfo, setVideoInfo] =
    useState(null);

  const [selectedQuality, setSelectedQuality] =
    useState(null);

  const [downloadResult, setDownloadResult] =
    useState(null);

  /* =======================================================
     FILTER TOOLS
  ======================================================= */

  const filteredTools = useMemo(() => {
    const text =
      search.toLowerCase().trim();

    return toolsData.filter(
      (tool) => {
        const matchesSearch =
          !text ||
          tool.name
            .toLowerCase()
            .includes(text) ||
          tool.description
            .toLowerCase()
            .includes(text) ||
          tool.category
            .toLowerCase()
            .includes(text);

        const matchesCategory =
          category === "All" ||
          tool.category === category;

        return (
          matchesSearch &&
          matchesCategory
        );
      }
    );
  }, [
    search,
    category,
  ]);

  /* =======================================================
     OPEN TOOL
  ======================================================= */

  const openTool = (tool) => {
    setActiveTool(tool);

    setInputValue("");

    setError("");

    setProgress(0);

    setVideoInfo(null);

    setSelectedQuality(null);

    setDownloadResult(null);

    setIsExtracting(false);

    setIsDownloading(false);
  };

  /* =======================================================
     CLOSE MODAL
  ======================================================= */

  const closeModal = () => {
    if (
      isExtracting ||
      isDownloading
    ) {
      return;
    }

    if (
      downloadResult?.downloadUrl
    ) {
      try {
        window.URL.revokeObjectURL(
          downloadResult.downloadUrl
        );
      } catch {
        // Ignore.
      }
    }

    setActiveTool(null);

    setInputValue("");

    setError("");

    setProgress(0);

    setVideoInfo(null);

    setSelectedQuality(null);

    setDownloadResult(null);

    setIsExtracting(false);

    setIsDownloading(false);
  };

  /* =======================================================
     EXTRACT VIDEO / MEDIA
  ======================================================= */

  const extractVideo = async (
    event
  ) => {
    event.preventDefault();

    if (!activeTool) {
      return;
    }

    setError("");

    setVideoInfo(null);

    setSelectedQuality(null);

    setDownloadResult(null);

    setProgress(10);

    const cleanUrl =
      inputValue.trim();

    /* -----------------------------------------
       EMPTY URL
    ----------------------------------------- */

    if (!cleanUrl) {
      setError(
        "Please enter a URL."
      );

      setProgress(0);

      return;
    }

    /* -----------------------------------------
       URL VALIDATION
    ----------------------------------------- */

    if (
      !validatePlatformUrl(
        cleanUrl,
        activeTool.slug
      )
    ) {
      setError(
        `Please enter a valid ${activeTool.category} URL.`
      );

      setProgress(0);

      return;
    }

    setIsExtracting(true);

    setProgress(20);

    try {
      const response =
        await axios.post(
          `${API_BASE_URL}/tools/extract`,
          {
            tool:
              activeTool.slug,

            url: cleanUrl,
          },
          {
            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            timeout: 120000,
          }
        );

      setProgress(85);

      if (
        !response?.data?.success
      ) {
        throw new Error(
          response?.data?.message ||
            "Unable to extract media information."
        );
      }

      const data =
        response.data.data ||
        response.data;

      if (!data) {
        throw new Error(
          "No media information was returned by the server."
        );
      }

      setVideoInfo(data);

      /* -----------------------------------------
         PHOTO RESULT
      ----------------------------------------- */

      if (
        data.isPhoto === true
      ) {
        setSelectedQuality(
          null
        );

        setProgress(100);

        return;
      }

      /* -----------------------------------------
         AVAILABLE FORMATS
      ----------------------------------------- */

      const availableFormats =
        Array.isArray(
          data.formats
        )
          ? data.formats
          : [];

      const availableHeights =
        availableFormats
          .map((item) =>
            Number(item?.height)
          )
          .filter(
            (height) =>
              Number.isFinite(
                height
              ) && height > 0
          );

      /* -----------------------------------------
         UNIQUE HEIGHTS
      ----------------------------------------- */

      const uniqueHeights =
        [
          ...new Set(
            availableHeights
          ),
        ];

      /* -----------------------------------------
         PREFERRED QUALITY
      ----------------------------------------- */

      const preferredQuality = [
        1080,
        720,
        480,
        360,
      ].find((quality) =>
        uniqueHeights.includes(
          quality
        )
      );

      if (
        preferredQuality
      ) {
        setSelectedQuality(
          preferredQuality
        );
      } else if (
        uniqueHeights.length > 0
      ) {
        setSelectedQuality(
          Math.max(
            ...uniqueHeights
          )
        );
      } else {
        /*
          Backend may not expose height.
          Default to 720 because backend
          accepts quality.
        */

        setSelectedQuality(
          720
        );
      }

      setProgress(100);
    } catch (err) {
      const message =
        await getAxiosErrorMessage(
          err
        );

      setError(
        message ||
          "Unable to extract media."
      );

      setProgress(0);

      setVideoInfo(null);

      setSelectedQuality(null);
    } finally {
      setIsExtracting(false);
    }
  };

  /* =======================================================
     DOWNLOAD VIDEO
  ======================================================= */

  const downloadVideo =
    async () => {
      if (
        !activeTool ||
        !videoInfo
      ) {
        return;
      }

      if (
        isDownloading ||
        isExtracting
      ) {
        return;
      }

      const cleanUrl =
        inputValue.trim();

      if (!cleanUrl) {
        setError(
          "Original URL is missing."
        );

        return;
      }

      setError("");

      setDownloadResult(null);

      setIsDownloading(true);

      setProgress(5);

      /*
        Find selected format.
      */

      const selectedFormat =
        Array.isArray(
          videoInfo.formats
        )
          ? videoInfo.formats.find(
              (format) =>
                Number(
                  format?.height
                ) ===
                Number(
                  selectedQuality
                )
            )
          : null;

      /*
        IMPORTANT:
        Do not send a direct URL unless backend
        actually provides one.
      */

      const payload = {
        tool:
          activeTool.slug,

        url: cleanUrl,

        quality:
          selectedQuality ||
          "best",

        format:
          selectedQuality
            ? `${selectedQuality}p`
            : "best",

        /*
          Only send formatId when backend
          actually provides it.
        */

        formatId:
          selectedFormat?.formatId ||
          null,

        title:
          videoInfo.title ||
          `${activeTool.category}-video`,
      };

      try {
        const response =
          await axios.post(
            `${API_BASE_URL}/tools/download`,
            payload,
            {
              headers: {
                "Content-Type":
                  "application/json",

                Accept:
                  "video/*,image/*,application/octet-stream,application/json",
              },

              responseType: "blob",

              timeout:
                15 * 60 * 1000,

              maxContentLength:
                Infinity,

              maxBodyLength:
                Infinity,

              onDownloadProgress:
                (
                  progressEvent
                ) => {
                  if (
                    progressEvent.total
                  ) {
                    const percent =
                      Math.round(
                        (progressEvent.loaded *
                          100) /
                          progressEvent.total
                      );

                    setProgress(
                      Math.min(
                        percent,
                        99
                      )
                    );
                  } else {
                    setProgress(
                      (previous) =>
                        previous <
                        90
                          ? previous +
                            3
                          : previous
                    );
                  }
                },
            }
          );

        /* =================================================
           IMPORTANT:
           Because responseType is blob, backend 500
           can also arrive as a Blob.
        ================================================= */

        const contentType =
          response.headers[
            "content-type"
          ] || "";

        /*
          Backend returned JSON instead of file.
        */

        if (
          contentType.includes(
            "application/json"
          )
        ) {
          const text =
            await response.data.text();

          let message =
            "Download failed.";

          try {
            const json =
              JSON.parse(text);

            message =
              json?.message ||
              json?.error ||
              message;
          } catch {
            if (text) {
              message = text;
            }
          }

          throw new Error(
            message
          );
        }

        /* =================================================
           CREATE BLOB
        ================================================= */

        const blob =
          response.data instanceof
          Blob
            ? response.data
            : new Blob(
                [response.data],
                {
                  type:
                    contentType ||
                    "application/octet-stream",
                }
              );

        if (
          !blob ||
          blob.size <= 0
        ) {
          throw new Error(
            "Downloaded file is empty."
          );
        }

        /* =================================================
           FILE TYPE
        ================================================= */

        const isPhoto =
          videoInfo?.isPhoto ===
            true ||
          contentType.includes(
            "image/"
          );

        let fallbackExtension =
          "mp4";

        if (isPhoto) {
          if (
            contentType.includes(
              "png"
            )
          ) {
            fallbackExtension =
              "png";
          } else if (
            contentType.includes(
              "webp"
            )
          ) {
            fallbackExtension =
              "webp";
          } else {
            fallbackExtension =
              "jpg";
          }
        } else if (
          contentType.includes(
            "webm"
          )
        ) {
          fallbackExtension =
            "webm";
        } else if (
          contentType.includes(
            "mkv"
          )
        ) {
          fallbackExtension =
            "mkv";
        } else if (
          contentType.includes(
            "mpeg"
          )
        ) {
          fallbackExtension =
            "mp3";
        }

        /* =================================================
           FILENAME
        ================================================= */

        const defaultFilename =
          `${activeTool.category.toLowerCase()}-${
            selectedQuality ||
            "video"
          }.${fallbackExtension}`;

        const filename =
          getFilenameFromHeaders(
            response.headers,
            defaultFilename
          );

        /* =================================================
           BLOB URL
        ================================================= */

        const downloadUrl =
          window.URL.createObjectURL(
            blob
          );

        setProgress(100);

        setDownloadResult({
          success: true,

          downloadUrl,

          filename,

          quality:
            selectedQuality,

          size: blob.size,

          isPhoto,
        });
      } catch (err) {
        const message =
          await getAxiosErrorMessage(
            err
          );

        setError(
          message ||
            "Unable to download file."
        );

        setProgress(0);
      } finally {
        setIsDownloading(false);
      }
    };

  /* =======================================================
     PROCESS ANOTHER
  ======================================================= */

  const processAnother =
    () => {
      if (
        downloadResult?.downloadUrl
      ) {
        try {
          window.URL.revokeObjectURL(
            downloadResult.downloadUrl
          );
        } catch {
          // Ignore.
        }
      }

      setInputValue("");

      setVideoInfo(null);

      setSelectedQuality(null);

      setDownloadResult(null);

      setError("");

      setProgress(0);

      setIsExtracting(false);

      setIsDownloading(false);
    };

  /* =======================================================
     QUALITY AVAILABLE
  ======================================================= */

  const hasQuality = (
    quality
  ) => {
    if (
      !videoInfo ||
      videoInfo.isPhoto
    ) {
      return false;
    }

    if (
      !Array.isArray(
        videoInfo.formats
      ) ||
      videoInfo.formats.length ===
        0
    ) {
      /*
        Backend did not provide format list.
        Allow quality because backend itself
        can select quality using yt-dlp.
      */

      return true;
    }

    return videoInfo.formats.some(
      (item) =>
        Number(
          item?.height
        ) === Number(quality)
    );
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-screen bg-[#090d16] font-sans text-slate-100 selection:bg-indigo-500/30 selection:text-white relative overflow-x-hidden">
      {/* ===================================================
          BACKGROUND
      =================================================== */}

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[350px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/15 to-pink-600/20 blur-[120px] pointer-events-none rounded-full" />

      {/* ===================================================
          HERO
      =================================================== */}

      <section className="relative pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-tight">
          Download Videos & Media
          <br className="hidden sm:block" />

          <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
            Without Limits.
          </span>
        </h1>

        <p className="mt-6 max-w-2xl mx-auto text-base sm:text-lg text-slate-400 leading-relaxed">
          Extract public videos and photos
          from YouTube, Facebook,
          Instagram, and Pinterest.
        </p>

        {/* =================================================
            SEARCH
        ================================================= */}

        <div className="mt-10 max-w-xl mx-auto">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-2xl blur opacity-30 group-hover:opacity-60 transition pointer-events-none" />

            <div className="relative flex items-center bg-[#131b2e] border border-slate-800 rounded-2xl shadow-xl overflow-hidden px-4 py-2">
              <span className="text-lg mr-3 text-slate-400">
                🔍
              </span>

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search platforms or tools..."
                className="w-full bg-transparent py-3 text-sm text-white placeholder-slate-500 outline-none"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================
          MAIN
      =================================================== */}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {/* =================================================
            CATEGORY TABS
        ================================================= */}

        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-4 mb-10">
          {categories.map(
            (item) => (
              <button
                key={item}
                type="button"
                onClick={() =>
                  setCategory(
                    item
                  )
                }
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition ${
                  category === item
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                    : "bg-slate-900/60 border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {item}
              </button>
            )
          )}
        </div>

        {/* =================================================
            TOOLS GRID
        ================================================= */}

        {filteredTools.length >
        0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTools.map(
              (tool) => (
                <div
                  key={tool.id}
                  className="group relative flex flex-col justify-between rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-7 shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-indigo-500/40"
                >
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div
                        className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center text-2xl font-black text-white`}
                      >
                        {tool.icon}
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-semibold border ${tool.badgeColor}`}
                      >
                        {tool.category}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white">
                      {tool.name}
                    </h3>

                    <p className="mt-2.5 text-sm leading-relaxed text-slate-400">
                      {tool.description}
                    </p>
                  </div>

                  <div className="mt-8 pt-5 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() =>
                        openTool(
                          tool
                        )
                      }
                      className="w-full rounded-xl bg-slate-800 hover:bg-gradient-to-r hover:from-indigo-600 hover:to-purple-600 px-4 py-3.5 text-sm font-bold text-white transition"
                    >
                      Launch Utility →
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 p-16 text-center">
            <h3 className="text-xl font-bold text-white">
              No tools found
            </h3>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCategory(
                  "All"
                );
              }}
              className="mt-6 px-6 py-3 rounded-xl bg-slate-800 hover:bg-indigo-600 font-semibold text-sm"
            >
              Reset Filters
            </button>
          </div>
        )}
      </main>

      {/* ===================================================
          MODAL
      =================================================== */}

      {activeTool && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md overflow-y-auto"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
                event.currentTarget &&
              !isExtracting &&
              !isDownloading
            ) {
              closeModal();
            }
          }}
        >
          <div className="relative w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl my-8">
            {/* TOP GRADIENT */}

            <div
              className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${activeTool.gradient}`}
            />

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="flex items-center justify-between border-b border-slate-800 pb-5">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${activeTool.gradient} flex items-center justify-center text-xl font-black`}
                >
                  {activeTool.icon}
                </div>

                <div>
                  <h3 className="font-bold text-white">
                    {activeTool.name}
                  </h3>

                  <span className="text-xs text-slate-400">
                    {activeTool.category}{" "}
                    Engine
                  </span>
                </div>
              </div>

              {!isExtracting &&
                !isDownloading && (
                  <button
                    type="button"
                    onClick={
                      closeModal
                    }
                    className="w-9 h-9 rounded-full bg-slate-800 text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                )}
            </div>

            {/* =================================================
                ERROR
            ================================================= */}

            {error && (
              <div className="mt-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
                <strong className="block mb-1">
                  Processing Failed
                </strong>

                <span className="text-xs break-words">
                  {error}
                </span>
              </div>
            )}

            {/* =================================================
                DOWNLOAD COMPLETE
            ================================================= */}

            {downloadResult?.success ? (
              <div className="py-8 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-3xl text-emerald-400 mb-5">
                  ✓
                </div>

                <h4 className="text-xl font-bold text-white">
                  {downloadResult.isPhoto
                    ? "Photo Ready"
                    : "Video Ready"}
                </h4>

                <p className="mt-2 text-sm text-slate-400">
                  {downloadResult.isPhoto
                    ? "High Quality Photo"
                    : `${downloadResult.quality}p video`}{" "}
                  is ready.
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  File size:{" "}
                  {formatBytes(
                    downloadResult.size
                  )}
                </p>

                <p className="mt-1 text-xs text-slate-600 truncate">
                  {downloadResult.filename}
                </p>

                {/* DOWNLOAD */}

                <a
                  href={
                    downloadResult.downloadUrl
                  }
                  download={
                    downloadResult.filename
                  }
                  className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4 text-sm font-bold text-white hover:from-emerald-400 hover:to-teal-500 transition"
                >
                  ⬇ Download File
                </a>

                {/* PROCESS ANOTHER */}

                <button
                  type="button"
                  onClick={
                    processAnother
                  }
                  className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-800/50 py-3.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"
                >
                  Process Another Link
                </button>
              </div>
            ) : videoInfo ? (
              /* =================================================
                 VIDEO INFORMATION / QUALITY
              ================================================= */

              <div className="mt-6">
                {/* =================================================
                    MEDIA INFORMATION
                ================================================= */}

                <div className="rounded-2xl border border-slate-800 bg-[#0c1322] p-4">
                  <div className="flex gap-4">
                    {videoInfo.thumbnail && (
                      <img
                        src={
                          videoInfo.thumbnail
                        }
                        alt="Thumbnail"
                        className="w-32 h-20 object-cover rounded-xl flex-shrink-0"
                        onError={(
                          event
                        ) => {
                          event.currentTarget.style.display =
                            "none";
                        }}
                      />
                    )}

                    <div className="min-w-0">
                      <h4 className="font-bold text-white line-clamp-2">
                        {videoInfo.title ||
                          "Media"}
                      </h4>

                      {videoInfo.duration && (
                        <p className="mt-1 text-xs text-slate-500">
                          Duration:{" "}
                          {
                            videoInfo.duration
                          }
                          s
                        </p>
                      )}

                      {videoInfo.uploader && (
                        <p className="mt-1 text-xs text-slate-500">
                          By:{" "}
                          {
                            videoInfo.uploader
                          }
                        </p>
                      )}

                      {videoInfo.platform && (
                        <p className="mt-1 text-xs text-slate-600 capitalize">
                          Platform:{" "}
                          {
                            videoInfo.platform
                          }
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* =================================================
                    PHOTO
                ================================================= */}

                {videoInfo.isPhoto ? (
                  <div className="mt-6">
                    <div className="rounded-2xl border border-slate-800 bg-slate-800/30 p-5 text-center">
                      <p className="text-sm text-slate-400">
                        Photo is ready to
                        download.
                      </p>
                    </div>

                    {isDownloading && (
                      <div className="mt-6">
                        <div className="flex justify-between text-xs mb-2">
                          <span className="text-slate-400">
                            Downloading...
                          </span>

                          <span className="text-indigo-400 font-bold">
                            {progress}%
                          </span>
                        </div>

                        <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all"
                            style={{
                              width: `${progress}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="mt-7 flex gap-3">
                      <button
                        type="button"
                        disabled={
                          isDownloading
                        }
                        onClick={
                          processAnother
                        }
                        className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-3.5 text-sm font-semibold text-slate-300 disabled:opacity-50"
                      >
                        Change URL
                      </button>

                      <button
                        type="button"
                        disabled={
                          isDownloading
                        }
                        onClick={
                          downloadVideo
                        }
                        className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3.5 text-sm font-bold text-white disabled:opacity-50"
                      >
                        {isDownloading
                          ? "Downloading..."
                          : "Download Photo"}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* =================================================
                     QUALITY SELECTOR
                  ================================================= */

                  <div className="mt-6">
                    <h4 className="font-bold text-white mb-3">
                      Select Quality
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      {QUALITY_OPTIONS.map(
                        (quality) => {
                          const available =
                            hasQuality(
                              quality.value
                            );

                          const selected =
                            Number(
                              selectedQuality
                            ) ===
                            Number(
                              quality.value
                            );

                          return (
                            <button
                              key={
                                quality.value
                              }
                              type="button"
                              disabled={
                                isDownloading ||
                                !available
                              }
                              onClick={() =>
                                setSelectedQuality(
                                  quality.value
                                )
                              }
                              className={`relative rounded-2xl border p-4 text-left transition ${
                                selected
                                  ? "border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/20"
                                  : available
                                  ? "border-slate-700 bg-slate-800/40 hover:border-indigo-500/50"
                                  : "border-slate-800 bg-slate-900/50 opacity-40 cursor-not-allowed"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-white">
                                  {
                                    quality.label
                                  }
                                </span>

                                {selected && (
                                  <span className="text-indigo-400">
                                    ✓
                                  </span>
                                )}
                              </div>

                              {!available && (
                                <span className="mt-1 block text-[10px] text-slate-600">
                                  Not available
                                </span>
                              )}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}

                {/* =================================================
                    DOWNLOAD PROGRESS
                ================================================= */}

                {isDownloading && (
                  <div className="mt-6">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-slate-400">
                        Downloading...
                      </span>

                      <span className="text-indigo-400 font-bold">
                        {progress}%
                      </span>
                    </div>

                    <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all"
                        style={{
                          width: `${progress}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* =================================================
                    ACTION BUTTONS
                ================================================= */}

                {!videoInfo.isPhoto && (
                  <div className="mt-7 flex gap-3">
                    <button
                      type="button"
                      disabled={
                        isDownloading
                      }
                      onClick={
                        processAnother
                      }
                      className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-3.5 text-sm font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                    >
                      Change URL
                    </button>

                    <button
                      type="button"
                      disabled={
                        !selectedQuality ||
                        isDownloading
                      }
                      onClick={
                        downloadVideo
                      }
                      className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3.5 text-sm font-bold text-white disabled:opacity-50"
                    >
                      {isDownloading
                        ? "Downloading..."
                        : "Download Now"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* =================================================
                 URL FORM
              ================================================= */

              <form
                onSubmit={
                  extractVideo
                }
                className="mt-6 space-y-5"
              >
                <p className="text-sm leading-relaxed text-slate-400">
                  Paste the public{" "}
                  {
                    activeTool.category
                  }{" "}
                  link below to extract
                  available download
                  options.
                </p>

                {/* URL */}

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Target{" "}
                    {
                      activeTool.category
                    }{" "}
                    URL
                  </label>

                  <input
                    type="url"
                    required
                    value={
                      inputValue
                    }
                    onChange={(
                      event
                    ) =>
                      setInputValue(
                        event.target
                          .value
                      )
                    }
                    placeholder={
                      activeTool.category ===
                      "YouTube"
                        ? "https://youtube.com/watch?v=..."
                        : activeTool.category ===
                          "Facebook"
                        ? "https://facebook.com/..."
                        : activeTool.category ===
                          "Instagram"
                        ? "https://instagram.com/reel/..."
                        : "https://pinterest.com/pin/..."
                    }
                    disabled={
                      isExtracting
                    }
                    className="w-full rounded-2xl border border-slate-800 bg-[#0c1322] px-4 py-3.5 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                  />
                </div>

                {/* EXTRACT PROGRESS */}

                {isExtracting && (
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-slate-400">
                        Extracting details...
                      </span>

                      <span className="text-indigo-400 font-bold">
                        {progress}%
                      </span>
                    </div>

                    <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all"
                        style={{
                          width: `${progress}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* =================================================
                    ACTIONS
                ================================================= */}

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    disabled={
                      isExtracting
                    }
                    onClick={
                      closeModal
                    }
                    className="rounded-xl px-5 py-3 text-sm font-semibold text-slate-400 hover:bg-slate-800 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      isExtracting ||
                      !inputValue.trim()
                    }
                    className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {isExtracting
                      ? "Extracting..."
                      : "Extract Media"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Tools;
