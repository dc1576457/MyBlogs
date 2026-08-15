import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardPaste,
  Copy,
  Download,
  ExternalLink,
  Film,
  Image as ImageIcon,
  Layers,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from "lucide-react";

/* =========================================================
   API CONFIG
========================================================= */

const RAW_API_URL =
  import.meta.env.VITE_API_URL || "https://myblogs-fr9t.onrender.com/api";

const API_BASE_URL = RAW_API_URL.replace(/^http:\/\//i, "https://").replace(
  /\/+$/,
  ""
);

/* =========================================================
   PLATFORM ICONS (Crisp SVGs)
========================================================= */

const YoutubeIcon = () => (
  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const FacebookIcon = () => (
  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const InstagramIcon = () => (
  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const PinterestIcon = () => (
  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" />
  </svg>
);

/* =========================================================
   TOOLS DATA
========================================================= */

const toolsData = [
  {
    id: 1,
    name: "YouTube Video Downloader",
    slug: "youtube-video-downloader",
    description:
      "Extract available video qualities and save public YouTube content with audio.",
    category: "YouTube",
    icon: YoutubeIcon,
    accentGlow: "from-red-500/20 via-rose-500/10 to-transparent",
    accentBorder: "group-hover:border-red-500/40",
    gradient: "from-red-500 via-rose-500 to-red-600",
    badgeColor: "bg-red-500/10 text-red-400 border-red-500/20",
    comingSoon: true,
  },
  {
    id: 2,
    name: "Facebook Video Downloader",
    slug: "facebook-video-downloader",
    description:
      "Download publicly accessible Facebook videos in high definition (HD & SD).",
    category: "Facebook",
    icon: FacebookIcon,
    accentGlow: "from-blue-500/20 via-indigo-500/10 to-transparent",
    accentBorder: "group-hover:border-blue-500/40",
    gradient: "from-blue-600 via-indigo-600 to-cyan-500",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    comingSoon: false,
  },
  {
    id: 3,
    name: "Instagram Downloader",
    slug: "instagram-video-downloader",
    description:
      "Save Instagram Reels, public video posts, and stories in original quality.",
    category: "Instagram",
    icon: InstagramIcon,
    accentGlow: "from-pink-500/20 via-fuchsia-500/10 to-transparent",
    accentBorder: "group-hover:border-pink-500/40",
    gradient: "from-pink-500 via-fuchsia-600 to-amber-500",
    badgeColor: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    comingSoon: true,
  },
  {
    id: 4,
    name: "Pinterest Media Downloader",
    slug: "pinterest-downloader",
    description:
      "Download Pinterest videos, GIF pins, and original full-resolution photos instantly.",
    category: "Pinterest",
    icon: PinterestIcon,
    accentGlow: "from-rose-500/20 via-red-500/10 to-transparent",
    accentBorder: "group-hover:border-rose-500/40",
    gradient: "from-red-600 via-rose-600 to-red-500",
    badgeColor: "bg-red-600/10 text-red-400 border-red-600/20",
    comingSoon: false,
  },
];

const categories = ["All", "YouTube", "Facebook", "Instagram", "Pinterest"];

const QUALITY_OPTIONS = [
  { value: 360, label: "360p", badge: "Fast" },
  { value: 480, label: "480p", badge: "SD" },
  { value: 720, label: "720p HD", badge: "Recommended" },
  { value: 1080, label: "1080p FHD", badge: "Crisp" },
];

/* =========================================================
   PLATFORM URL VALIDATION
========================================================= */

const validatePlatformUrl = (value, slug) => {
  try {
    if (!value?.trim()) return false;
    const parsed = new URL(value.trim());
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");

    if (slug === "youtube-video-downloader") {
      return (
        hostname === "youtube.com" ||
        hostname === "m.youtube.com" ||
        hostname === "youtu.be" ||
        hostname.endsWith(".youtube.com")
      );
    }
    if (slug === "facebook-video-downloader") {
      return (
        hostname === "facebook.com" ||
        hostname === "m.facebook.com" ||
        hostname === "fb.watch" ||
        hostname.endsWith(".facebook.com")
      );
    }
    if (slug === "instagram-video-downloader") {
      return (
        hostname === "instagram.com" ||
        hostname === "m.instagram.com" ||
        hostname.endsWith(".instagram.com")
      );
    }
    if (slug === "pinterest-downloader") {
      return (
        hostname === "pinterest.com" ||
        hostname === "m.pinterest.com" ||
        hostname === "pin.it" ||
        hostname.endsWith(".pinterest.com")
      );
    }
    return false;
  } catch {
    return false;
  }
};

/* =========================================================
   HELPERS
========================================================= */

const formatBytes = (bytes) => {
  if (!bytes || Number.isNaN(Number(bytes))) return "Size calculating...";
  const value = Number(bytes);
  if (value <= 0) return "Ready";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const getFilenameFromHeaders = (headers, fallback) => {
  try {
    const disposition = headers?.["content-disposition"];
    if (!disposition) return fallback;
    const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utfMatch?.[1]) return decodeURIComponent(utfMatch[1]);
    const normalMatch = disposition.match(/filename="?([^"]+)"?/i);
    if (normalMatch?.[1]) return decodeURIComponent(normalMatch[1]);
    return fallback;
  } catch {
    return fallback;
  }
};

const getAxiosErrorMessage = async (error) => {
  if (error?.response?.data && !(error.response.data instanceof Blob)) {
    return (
      error.response.data.message ||
      error.response.data.error ||
      "Request failed."
    );
  }
  if (error?.response?.data instanceof Blob) {
    try {
      const text = await error.response.data.text();
      if (text) {
        try {
          const json = JSON.parse(text);
          return json?.message || json?.error || text;
        } catch {
          return text;
        }
      }
    } catch {
      // Ignore
    }
  }
  if (error?.code === "ECONNABORTED") {
    return "Server request timed out. Please try again.";
  }
  return error?.message || "Something went wrong.";
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function Tools() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [activeTool, setActiveTool] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [videoInfo, setVideoInfo] = useState(null);
  const [selectedQuality, setSelectedQuality] = useState(null);
  const [downloadResult, setDownloadResult] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && activeTool && !isExtracting && !isDownloading) {
        closeModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTool, isExtracting, isDownloading]);

  /* Filter Tools */
  const filteredTools = useMemo(() => {
    const text = search.toLowerCase().trim();
    return toolsData.filter((tool) => {
      const matchesSearch =
        !text ||
        tool.name.toLowerCase().includes(text) ||
        tool.description.toLowerCase().includes(text) ||
        tool.category.toLowerCase().includes(text);
      const matchesCategory =
        category === "All" || tool.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [search, category]);

  /* Open / Close Handlers */
  const openTool = (tool) => {
    if (tool.comingSoon) return;
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

  const closeModal = () => {
    if (isExtracting || isDownloading) return;
    if (downloadResult?.downloadUrl) {
      try {
        window.URL.revokeObjectURL(downloadResult.downloadUrl);
      } catch {
        // Ignore
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

  /* Paste from Clipboard */
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputValue(text.trim());
      }
    } catch {
      // Fallback ignore
    }
  };

  /* Extract Media Information */
  const extractVideo = async (event) => {
    event.preventDefault();
    if (!activeTool) return;

    setError("");
    setVideoInfo(null);
    setSelectedQuality(null);
    setDownloadResult(null);
    setProgress(15);

    const cleanUrl = inputValue.trim();
    if (!cleanUrl) {
      setError("Please paste a valid video or media link.");
      setProgress(0);
      return;
    }

    if (!validatePlatformUrl(cleanUrl, activeTool.slug)) {
      setError(
        `Invalid URL format. Please provide a valid ${activeTool.category} link.`
      );
      setProgress(0);
      return;
    }

    setIsExtracting(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/tools/extract`,
        {
          tool: activeTool.slug,
          platform: activeTool.category.toLowerCase(),
          url: cleanUrl,
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 120000,
        }
      );

      setProgress(85);

      if (!response?.data?.success) {
        throw new Error(
          response?.data?.message || "Unable to extract media information."
        );
      }

      const data = response.data.data || response.data;
      if (!data) {
        throw new Error("No media stream found on this page.");
      }

      setVideoInfo(data);

      if (data.isPhoto === true) {
        setSelectedQuality(null);
        setProgress(100);
        return;
      }

      const availableFormats = Array.isArray(data.formats) ? data.formats : [];
      const availableHeights = availableFormats
        .map((item) => Number(item?.height))
        .filter((height) => Number.isFinite(height) && height > 0);

      const uniqueHeights = [...new Set(availableHeights)];
      const preferredQuality = [720, 1080, 480, 360].find((quality) =>
        uniqueHeights.includes(quality)
      );

      if (preferredQuality) {
        setSelectedQuality(preferredQuality);
      } else if (uniqueHeights.length > 0) {
        setSelectedQuality(Math.max(...uniqueHeights));
      } else {
        setSelectedQuality(720);
      }

      setProgress(100);
    } catch (err) {
      const message = await getAxiosErrorMessage(err);
      setError(message || "Unable to fetch media stream. Please verify the URL.");
      setProgress(0);
      setVideoInfo(null);
      setSelectedQuality(null);
    } finally {
      setIsExtracting(false);
    }
  };

  /* Download Media */
  const downloadVideo = async () => {
    if (!activeTool || !videoInfo || isDownloading || isExtracting) return;

    const cleanUrl = inputValue.trim();
    if (!cleanUrl) {
      setError("Original URL is missing.");
      return;
    }

    setError("");
    setDownloadResult(null);
    setIsDownloading(true);
    setProgress(5);

    const selectedFormat = Array.isArray(videoInfo.formats)
      ? videoInfo.formats.find(
          (format) => Number(format?.height) === Number(selectedQuality)
        )
      : null;

    const payload = {
      tool: activeTool.slug,
      platform: activeTool.category.toLowerCase(),
      url: cleanUrl,
      quality: selectedQuality || 720,
      format: selectedQuality ? `${selectedQuality}p` : "720p",
      formatId: selectedFormat?.formatId || String(selectedQuality || "720"),
      title: videoInfo.title || `${activeTool.category}-media`,
      isPhoto: Boolean(videoInfo.isPhoto),
      directUrl: videoInfo.isPhoto
        ? videoInfo.thumbnail || videoInfo.url
        : selectedFormat?.directUrl || null,
    };

    try {
      const response = await axios.post(
        `${API_BASE_URL}/tools/download`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
          responseType: "blob",
          timeout: 120000,
          onDownloadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setProgress(Math.min(percent, 99));
            } else {
              setProgress((previous) => (previous < 90 ? previous + 5 : previous));
            }
          },
        }
      );

      const contentType = response.headers["content-type"] || "";

      // Handle JSON response
      if (contentType.includes("application/json")) {
        const text = await response.data.text();
        let json = {};
        try {
          json = JSON.parse(text);
        } catch {
          // Ignore
        }

        if (json.downloadUrl) {
          setProgress(100);
          setDownloadResult({
            success: true,
            downloadUrl: json.downloadUrl,
            filename:
              json.filename || `${activeTool.category.toLowerCase()}-media.mp4`,
            quality: selectedQuality || 720,
            size: json.size || 0,
            isPhoto: false,
          });
          return;
        }
        throw new Error(
          json?.message || "Download failed. Please try another quality."
        );
      }

      // Handle direct file blob
      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], {
              type: contentType || "application/octet-stream",
            });

      if (!blob || blob.size <= 0) {
        throw new Error("Downloaded stream returned an empty file.");
      }

      const isPhoto =
        videoInfo?.isPhoto === true || contentType.includes("image/");
      let fallbackExtension = isPhoto ? "jpg" : "mp4";
      if (contentType.includes("png")) fallbackExtension = "png";
      else if (contentType.includes("webp")) fallbackExtension = "webp";

      const defaultFilename = `${activeTool.category.toLowerCase()}-${
        selectedQuality || "media"
      }.${fallbackExtension}`;

      const filename = getFilenameFromHeaders(
        response.headers,
        defaultFilename
      );

      const downloadUrl = window.URL.createObjectURL(blob);
      setProgress(100);

      setDownloadResult({
        success: true,
        downloadUrl,
        filename,
        quality: selectedQuality,
        size: blob.size,
        isPhoto,
      });
    } catch (err) {
      const message = await getAxiosErrorMessage(err);
      setError(message || "Unable to download file.");
      setProgress(0);
    } finally {
      setIsDownloading(false);
    }
  };

  const processAnother = () => {
    if (downloadResult?.downloadUrl) {
      try {
        window.URL.revokeObjectURL(downloadResult.downloadUrl);
      } catch {
        // Ignore
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

  const hasQuality = (quality) => {
    if (!videoInfo || videoInfo.isPhoto) return false;
    if (!Array.isArray(videoInfo.formats) || videoInfo.formats.length === 0)
      return true;
    return videoInfo.formats.some(
      (item) => Number(item?.height) === Number(quality)
    );
  };

  const copyDownloadUrl = () => {
    if (downloadResult?.downloadUrl) {
      navigator.clipboard.writeText(downloadResult.downloadUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#070816] text-white font-sans selection:bg-orange-500/30 selection:text-orange-200 overflow-x-hidden pb-24">
      {/* Dynamic Background Ambient Glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 -top-40 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-gradient-to-tr from-indigo-600/15 via-orange-600/10 to-pink-600/15 blur-[140px]" />
        <div className="absolute right-[-120px] top-[30%] h-[400px] w-[400px] rounded-full bg-purple-600/10 blur-[120px]" />
      </div>

      {/* Hero Header */}
      <header className="relative z-10 mx-auto max-w-7xl px-4 pt-16 pb-10 sm:px-6 lg:pt-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/[0.08] px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-widest text-orange-300 backdrop-blur-xl mb-5 shadow-sm">
          <Zap className="h-3.5 w-3.5" />
          Fast & Cloud Powered Utilities
        </div>

        <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl leading-[1.1]">
          Media Extractor &{" "}
          <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-rose-400 bg-clip-text text-transparent">
            Downloader Hub.
          </span>
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base text-slate-400 leading-relaxed">
          Easily extract and save high-resolution public media from Facebook & Pinterest with no watermarks or limits.
        </p>

        {/* Search Bar */}
        <div className="mx-auto mt-8 max-w-xl">
          <div className="group relative">
            <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-orange-500/20 via-indigo-500/20 to-pink-500/20 opacity-70 blur-md transition duration-300 group-focus-within:opacity-100" />
            <div className="relative flex items-center rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 shadow-2xl backdrop-blur-xl focus-within:border-orange-400/50">
              <Search className="mr-3 h-4 w-4 shrink-0 text-orange-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tools, platforms, or format..."
                className="w-full bg-transparent text-xs sm:text-sm text-white placeholder:text-slate-500 outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid Section */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Category Pills */}
        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
          {categories.map((item) => {
            const active = category === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 ${
                  active
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20"
                    : "border border-white/10 bg-white/[0.025] text-slate-400 hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>

        {/* Tools Cards Grid */}
        {filteredTools.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {filteredTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <div
                  key={tool.id}
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] p-5 backdrop-blur-xl shadow-lg transition-all duration-300 ${
                    tool.comingSoon
                      ? "opacity-80"
                      : `hover:-translate-y-1 hover:bg-white/[0.05] ${tool.accentBorder} hover:shadow-xl`
                  }`}
                >
                  {/* Subtle top glow */}
                  <div
                    className={`pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 h-28 w-28 rounded-full bg-gradient-to-b ${tool.accentGlow} blur-xl`}
                  />

                  <div>
                    {/* Header: Icon + Category Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr ${tool.gradient} text-white shadow-md shadow-black/30`}
                      >
                        <Icon />
                      </div>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tool.badgeColor}`}
                      >
                        {tool.category}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-base font-bold text-white group-hover:text-orange-200 transition-colors">
                      {tool.name}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">
                      {tool.description}
                    </p>
                  </div>

                  {/* Launch CTA */}
                  <div className="mt-6 pt-3.5 border-t border-white/5">
                    {tool.comingSoon ? (
                      <div className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.07] py-2.5 text-xs font-bold text-amber-300">
                        <Sparkles className="h-3.5 w-3.5" />
                        Coming Soon
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openTool(tool)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        Launch Downloader
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
            <Search className="mx-auto h-8 w-8 text-orange-400/80" />
            <h3 className="mt-3 text-base font-bold text-white">No tools found</h3>
            <p className="mt-1 text-xs text-slate-400">
              No platform matched your query "{search}".
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCategory("All");
              }}
              className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/15 transition"
            >
              Reset Filters
            </button>
          </div>
        )}
      </main>

      {/* =========================================================
          DOWNLOAD UTILITY MODAL
      ========================================================= */}

      {activeTool && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isExtracting && !isDownloading) {
              closeModal();
            }
          }}
        >
          <div className="relative w-full max-w-xl rounded-3xl border border-white/15 bg-[#0d0f22] p-6 shadow-2xl my-8">
            {/* Top gradient stripe */}
            <div
              className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${activeTool.gradient}`}
            />

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr ${activeTool.gradient} text-white shadow-md`}
                >
                  <activeTool.icon />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    {activeTool.name}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Direct Cloud Stream Extractor
                  </p>
                </div>
              </div>

              {!isExtracting && !isDownloading && (
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/10 hover:text-white transition"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Error Message Box */}
            {error && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <span className="font-bold block">Processing Error</span>
                  <span className="text-[11px] opacity-90">{error}</span>
                </div>
              </div>
            )}

            {/* =========================================================
                VIEW 1: DOWNLOAD COMPLETE
            ========================================================= */}
            {downloadResult?.success ? (
              <div className="py-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 mb-4 shadow-lg shadow-emerald-500/10">
                  <CheckCircle2 className="h-7 w-7" />
                </div>

                <h4 className="text-lg font-extrabold text-white">
                  {downloadResult.isPhoto ? "Photo Ready!" : "Video Ready to Save!"}
                </h4>

                <p className="mt-1 text-xs text-slate-400">
                  {downloadResult.isPhoto
                    ? "Full resolution original picture"
                    : `${downloadResult.quality}p High Quality Stream`}{" "}
                  is ready.
                </p>

                <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] text-slate-300">
                  <span>File Size: {formatBytes(downloadResult.size)}</span>
                </div>

                <div className="mt-6 flex flex-col gap-2.5">
                  <a
                    href={downloadResult.downloadUrl}
                    download={downloadResult.filename}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:opacity-95"
                  >
                    <Download className="h-4 w-4" />
                    Download File to Device
                  </a>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={copyDownloadUrl}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          Copied Link
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copy Link
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={processAnother}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Download Another
                    </button>
                  </div>
                </div>
              </div>
            ) : videoInfo ? (
              /* =========================================================
                 VIEW 2: MEDIA OPTIONS & QUALITY SELECTION
              ========================================================= */
              <div className="mt-5 space-y-4">
                {/* Media Preview Card */}
                <div className="flex items-center gap-3.5 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  {videoInfo.thumbnail ? (
                    <img
                      src={videoInfo.thumbnail}
                      alt="Thumbnail"
                      className="h-16 w-24 rounded-lg object-cover border border-white/10 shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="flex h-16 w-24 items-center justify-center rounded-lg bg-slate-900 border border-white/10 text-slate-500 shrink-0">
                      <Film className="h-6 w-6" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h4 className="line-clamp-2 text-xs font-bold text-white">
                      {videoInfo.title || "Target Media"}
                    </h4>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                      {videoInfo.uploader && (
                        <span>By {videoInfo.uploader}</span>
                      )}
                      <span>•</span>
                      <span className="capitalize">{videoInfo.platform || activeTool.category}</span>
                    </div>
                  </div>
                </div>

                {/* Quality Grid for Videos */}
                {!videoInfo.isPhoto && (
                  <div>
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Select Video Quality
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      {QUALITY_OPTIONS.map((quality) => {
                        const available = hasQuality(quality.value);
                        const selected =
                          Number(selectedQuality) === Number(quality.value);

                        return (
                          <button
                            key={quality.value}
                            type="button"
                            disabled={isDownloading || !available}
                            onClick={() => setSelectedQuality(quality.value)}
                            className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all ${
                              selected
                                ? "border-orange-400 bg-orange-500/15 shadow-sm shadow-orange-500/20"
                                : available
                                ? "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]"
                                : "border-white/5 bg-white/[0.01] opacity-35 cursor-not-allowed"
                            }`}
                          >
                            <div>
                              <span className="text-xs font-bold text-white block">
                                {quality.label}
                              </span>
                              <span className="text-[9px] text-slate-400">
                                {available ? quality.badge : "Unavailable"}
                              </span>
                            </div>

                            {selected && (
                              <Check className="h-4 w-4 text-orange-400" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Download Progress Bar */}
                {isDownloading && (
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] mb-1.5">
                      <span className="text-slate-400">Downloading stream...</span>
                      <span className="text-orange-400 font-bold">{progress}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-rose-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-5 flex gap-2.5 pt-2">
                  <button
                    type="button"
                    disabled={isDownloading}
                    onClick={processAnother}
                    className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] py-3 text-xs font-bold text-slate-300 hover:bg-white/10 transition disabled:opacity-40"
                  >
                    Change Link
                  </button>

                  <button
                    type="button"
                    disabled={(!videoInfo.isPhoto && !selectedQuality) || isDownloading}
                    onClick={downloadVideo}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-3 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:opacity-95 transition disabled:opacity-40"
                  >
                    {isDownloading ? (
                      `Downloading ${progress}%`
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        {videoInfo.isPhoto ? "Download Photo" : "Download Video"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* =========================================================
                 VIEW 3: URL INPUT FORM
              ========================================================= */
              <form onSubmit={extractVideo} className="mt-4 space-y-4">
                <p className="text-xs leading-relaxed text-slate-400">
                  Paste the public {activeTool.category} post or video link to extract downloadable formats.
                </p>

                <div>
                  <div className="relative">
                    <input
                      type="url"
                      required
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={
                        activeTool.category === "Facebook"
                          ? "https://www.facebook.com/watch/?v=..."
                          : "https://www.pinterest.com/pin/..."
                      }
                      disabled={isExtracting}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 pr-20 text-xs sm:text-sm text-white placeholder:text-slate-600 outline-none focus:border-orange-400/50"
                    />

                    {/* Quick Paste Button inside input */}
                    <button
                      type="button"
                      onClick={handlePasteClipboard}
                      className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-[10px] font-bold text-slate-300 hover:bg-white/15 hover:text-white transition"
                    >
                      <ClipboardPaste className="h-3 w-3" />
                      Paste
                    </button>
                  </div>
                </div>

                {/* Extraction Progress */}
                {isExtracting && (
                  <div className="pt-2">
                    <div className="flex justify-between text-[11px] mb-1.5">
                      <span className="text-slate-400">
                        Inspecting media headers...
                      </span>
                      <span className="text-orange-400 font-bold">
                        {progress}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-rose-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Form Buttons */}
                <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    disabled={isExtracting}
                    onClick={closeModal}
                    className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-400 hover:bg-white/10 hover:text-white transition disabled:opacity-40"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isExtracting || !inputValue.trim()}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:opacity-95 transition disabled:opacity-40"
                  >
                    {isExtracting ? (
                      `Extracting ${progress}%`
                    ) : (
                      <>
                        Extract Media
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
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
