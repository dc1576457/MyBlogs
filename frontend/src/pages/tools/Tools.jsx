import React, { useMemo, useState } from "react";
import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL || "https://myblogs-fr9t.onrender.com/api";

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
    badgeColor: "bg-red-500/10 text-red-400 border-red-500/20",
  },
  {
    id: 2,
    name: "Facebook Video Downloader",
    slug: "facebook-video-downloader",
    description: "Download publicly accessible Facebook videos in HD and SD.",
    category: "Facebook",
    icon: "f",
    gradient: "from-blue-500 via-indigo-500 to-cyan-500",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  {
    id: 3,
    name: "Instagram Downloader",
    slug: "instagram-video-downloader",
    description: "Download publicly accessible Instagram Reels, videos, and photos.",
    category: "Instagram",
    icon: "◎",
    gradient: "from-fuchsia-500 via-pink-500 to-orange-400",
    badgeColor: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20",
  },
  {
    id: 4,
    name: "Pinterest Video & Photo Downloader",
    slug: "pinterest-downloader",
    description: "Download public Pinterest videos and high-resolution photos instantly.",
    category: "Pinterest",
    icon: "P",
    gradient: "from-red-600 via-rose-600 to-red-500",
    badgeColor: "bg-red-600/10 text-red-400 border-red-600/20",
  },
];

const categories = ["All", "YouTube", "Facebook", "Instagram", "Pinterest"];

const QUALITY_OPTIONS = [
  { value: 360, label: "360p" },
  { value: 480, label: "480p" },
  { value: 720, label: "720p HD" },
  { value: 1080, label: "1080p Full HD" },
];

/* =========================================================
   URL VALIDATION
========================================================= */

const validatePlatformUrl = (value, slug) => {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");

    if (slug === "youtube-video-downloader") {
      return (
        hostname === "youtube.com" ||
        hostname === "m.youtube.com" ||
        hostname === "youtu.be"
      );
    }

    if (slug === "facebook-video-downloader") {
      return (
        hostname === "facebook.com" ||
        hostname === "m.facebook.com" ||
        hostname === "fb.watch"
      );
    }

    if (slug === "instagram-video-downloader") {
      return (
        hostname === "instagram.com" ||
        hostname === "m.instagram.com"
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

const formatBytes = (bytes) => {
  if (!bytes || Number.isNaN(Number(bytes))) return "Size unknown";
  const value = Number(bytes);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

/* =========================================================
   COMPONENT
========================================================= */

function Tools() {
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

  const filteredTools = useMemo(() => {
    const text = search.toLowerCase().trim();
    return toolsData.filter((tool) => {
      const matchesSearch =
        !text ||
        tool.name.toLowerCase().includes(text) ||
        tool.description.toLowerCase().includes(text) ||
        tool.category.toLowerCase().includes(text);

      const matchesCategory = category === "All" || tool.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [search, category]);

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

  const closeModal = () => {
    if (isExtracting || isDownloading) return;
    if (downloadResult?.downloadUrl) {
      try {
        window.URL.revokeObjectURL(downloadResult.downloadUrl);
      } catch {}
    }
    setActiveTool(null);
    setInputValue("");
    setError("");
    setProgress(0);
    setVideoInfo(null);
    setSelectedQuality(null);
    setDownloadResult(null);
  };

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
      setError("Please enter a URL.");
      return;
    }

    if (!validatePlatformUrl(cleanUrl, activeTool.slug)) {
      setError(`Please enter a valid ${activeTool.category} URL.`);
      return;
    }

    setIsExtracting(true);

    try {
      const response = await axios.post(
        `${API_URL}/tools/extract`,
        { tool: activeTool.slug, url: cleanUrl },
        { headers: { "Content-Type": "application/json" }, timeout: 60000 }
      );

      setProgress(100);

      if (!response.data || !response.data.success) {
        throw new Error(response.data?.message || "Unable to extract video information.");
      }

      const data = response.data.data || response.data;
      setVideoInfo(data);

      const available = Array.isArray(data.formats) ? data.formats : [];
      const availableHeights = available.map((item) => Number(item.height)).filter(Boolean);

      const preferred = [1080, 720, 480, 360].find((q) => availableHeights.includes(q));

      if (preferred) {
        setSelectedQuality(preferred);
      } else if (availableHeights.length > 0) {
        setSelectedQuality(Math.max(...availableHeights));
      } else {
        setSelectedQuality(720);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to extract video.");
      setProgress(0);
    } finally {
      setIsExtracting(false);
    }
  };

const downloadVideo = async () => {
    if (!activeTool || !videoInfo) return;

    setError("");
    setDownloadResult(null);
    setIsDownloading(true);
    setProgress(10);

    const selectedFormat =
      videoInfo.formats?.find((f) => Number(f.height) === Number(selectedQuality)) ||
      videoInfo.formats?.[0];

    try {
      const response = await axios.post(
        `${API_URL}/tools/download`,
        {
          tool: activeTool.slug,
          url: inputValue.trim(),
          quality: selectedQuality,
          directUrl: selectedFormat?.directUrl || null,
        },
        {
          headers: { "Content-Type": "application/json" },
          responseType: "blob",
          timeout: 15 * 60 * 1000,
          onDownloadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setProgress(Math.min(percent, 99));
            } else {
              setProgress((prev) => (prev < 90 ? prev + 5 : prev));
            }
          },
        }
      );

      const blob = new Blob([response.data], {
        type: response.headers["content-type"] || "video/mp4",
      });

      if (blob.size <= 0) throw new Error("Downloaded file is empty.");

      const downloadUrl = window.URL.createObjectURL(blob);
      const isPhoto = videoInfo.isPhoto || response.headers["content-type"]?.includes("image");
      const ext = isPhoto ? "jpg" : "mp4";
      const filename = `${activeTool.category}-${selectedQuality || "media"}.${ext}`;

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
      let message = "Unable to download file.";
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          message = parsed.message || message;
        } catch {
          message = err.message || message;
        }
      } else if (err.response?.data?.message) {
        message = err.response.data.message;
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
      setProgress(0);
    } finally {
      setIsDownloading(false);
    }
  };

  const processAnother = () => {
    if (downloadResult?.downloadUrl) {
      try {
        window.URL.revokeObjectURL(downloadResult.downloadUrl);
      } catch {}
    }
    setInputValue("");
    setVideoInfo(null);
    setSelectedQuality(null);
    setDownloadResult(null);
    setError("");
    setProgress(0);
  };

  const hasQuality = (quality) => {
    if (!videoInfo?.formats) return true;
    return videoInfo.formats.some((item) => Number(item.height) === Number(quality));
  };

  return (
    <div className="min-h-screen bg-[#090d16] font-sans text-slate-100 selection:bg-indigo-500/30 selection:text-white relative overflow-x-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[350px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/15 to-pink-600/20 blur-[120px] pointer-events-none rounded-full" />

      {/* HERO */}
      <section className="relative pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-tight">
          Download Videos & Media
          <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
            Without Limits.
          </span>
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-base sm:text-lg text-slate-400 leading-relaxed">
          Extract public videos and photos from YouTube, Facebook, Instagram, and Pinterest.
        </p>

        {/* SEARCH BAR */}
        <div className="mt-10 max-w-xl mx-auto">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-2xl blur opacity-30 group-hover:opacity-60 transition pointer-events-none" />
            <div className="relative flex items-center bg-[#131b2e] border border-slate-800 rounded-2xl shadow-xl overflow-hidden px-4 py-2">
              <span className="text-lg mr-3 text-slate-400">🔍</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search platforms or tools..."
                className="w-full bg-transparent py-3 text-sm text-white placeholder-slate-500 outline-none"
              />
            </div>
          </div>
        </div>
      </section>

      {/* MAIN */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {/* CATEGORY TABS */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-4 mb-10">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition ${
                category === item
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
                  : "bg-slate-900/60 border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {/* TOOLS GRID */}
        {filteredTools.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTools.map((tool) => (
              <div
                key={tool.id}
                className="group relative flex flex-col justify-between rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-7 shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-indigo-500/40"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center text-2xl font-black text-white`}>
                      {tool.icon}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[11px] font-semibold border ${tool.badgeColor}`}>
                      {tool.category}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white">{tool.name}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-400">{tool.description}</p>
                </div>

                <div className="mt-8 pt-5 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => openTool(tool)}
                    className="w-full rounded-xl bg-slate-800 hover:bg-gradient-to-r hover:from-indigo-600 hover:to-purple-600 px-4 py-3.5 text-sm font-bold text-white transition"
                  >
                    Launch Utility →
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 p-16 text-center">
            <h3 className="text-xl font-bold text-white">No tools found</h3>
            <button
              type="button"
              onClick={() => { setSearch(""); setCategory("All"); }}
              className="mt-6 px-6 py-3 rounded-xl bg-slate-800 hover:bg-indigo-600 font-semibold text-sm"
            >
              Reset Filters
            </button>
          </div>
        )}
      </main>

      {/* MODAL */}
      {activeTool && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md overflow-y-auto"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isExtracting && !isDownloading) closeModal();
          }}
        >
          <div className="relative w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl my-8">
            <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${activeTool.gradient}`} />

            <div className="flex items-center justify-between border-b border-slate-800 pb-5">
              <div className="flex items-center gap-3.5">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${activeTool.gradient} flex items-center justify-center text-xl font-black`}>
                  {activeTool.icon}
                </div>
                <div>
                  <h3 className="font-bold text-white">{activeTool.name}</h3>
                  <span className="text-xs text-slate-400">{activeTool.category} Engine</span>
                </div>
              </div>

              {!isExtracting && !isDownloading && (
                <button type="button" onClick={closeModal} className="w-9 h-9 rounded-full bg-slate-800 text-slate-400 hover:text-white">
                  ✕
                </button>
              )}
            </div>

            {error && (
              <div className="mt-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
                <strong className="block mb-1">Processing Failed</strong>
                <span className="text-xs">{error}</span>
              </div>
            )}

            {/* DOWNLOAD COMPLETE */}
            {downloadResult?.success ? (
              <div className="py-8 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-3xl text-emerald-400 mb-5">
                  ✓
                </div>
                <h4 className="text-xl font-bold text-white">
                  {downloadResult.isPhoto ? "Photo Ready" : "Video Ready"}
                </h4>
                <p className="mt-2 text-sm text-slate-400">
                  {downloadResult.isPhoto ? "High Quality Photo" : `${downloadResult.quality}p video`} is ready.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  File size: {formatBytes(downloadResult.size)}
                </p>

                <a
                  href={downloadResult.downloadUrl}
                  download={downloadResult.filename}
                  className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4 text-sm font-bold text-white"
                >
                  ⬇ Download File
                </a>

                <button
                  type="button"
                  onClick={processAnother}
                  className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-800/50 py-3.5 text-sm font-semibold text-slate-300"
                >
                  Process Another Link
                </button>
              </div>
            ) : videoInfo ? (
              /* QUALITY SELECTOR */
              <div className="mt-6">
                <div className="rounded-2xl border border-slate-800 bg-[#0c1322] p-4">
                  <div className="flex gap-4">
                    {videoInfo.thumbnail && (
                      <img
                        src={videoInfo.thumbnail}
                        alt="Thumbnail"
                        className="w-32 h-20 object-cover rounded-xl"
                      />
                    )}
                    <div className="min-w-0">
                      <h4 className="font-bold text-white line-clamp-2">{videoInfo.title || "Media"}</h4>
                      {videoInfo.duration && <p className="mt-1 text-xs text-slate-500">Duration: {videoInfo.duration}</p>}
                      {videoInfo.uploader && <p className="mt-1 text-xs text-slate-500">By: {videoInfo.uploader}</p>}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="font-bold text-white mb-3">Select Quality</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {QUALITY_OPTIONS.map((quality) => {
                      const available = hasQuality(quality.value);
                      const selected = Number(selectedQuality) === Number(quality.value);

                      return (
                        <button
                          key={quality.value}
                          type="button"
                          disabled={isDownloading}
                          onClick={() => setSelectedQuality(quality.value)}
                          className={`relative rounded-2xl border p-4 text-left transition ${
                            selected
                              ? "border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/20"
                              : available
                              ? "border-slate-700 bg-slate-800/40 hover:border-indigo-500/50"
                              : "border-slate-800 bg-slate-900/50 opacity-40 cursor-not-allowed"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white">{quality.label}</span>
                            {selected && <span className="text-indigo-400">✓</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {isDownloading && (
                  <div className="mt-6">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-slate-400">Downloading...</span>
                      <span className="text-indigo-400 font-bold">{progress}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}

                <div className="mt-7 flex gap-3">
                  <button type="button" disabled={isDownloading} onClick={processAnother} className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-3.5 text-sm font-semibold text-slate-300">
                    Change URL
                  </button>
                  <button type="button" disabled={!selectedQuality || isDownloading} onClick={downloadVideo} className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3.5 text-sm font-bold text-white disabled:opacity-50">
                    {isDownloading ? "Downloading..." : "Download Now"}
                  </button>
                </div>
              </div>
            ) : (
              /* URL FORM */
              <form onSubmit={extractVideo} className="mt-6 space-y-5">
                <p className="text-sm leading-relaxed text-slate-400">
                  Paste the public {activeTool.category} link below to extract available download options.
                </p>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Target {activeTool.category} URL
                  </label>
                  <input
                    type="url"
                    required
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={`https://${activeTool.category.toLowerCase()}.com/...`}
                    disabled={isExtracting}
                    className="w-full rounded-2xl border border-slate-800 bg-[#0c1322] px-4 py-3.5 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500"
                  />
                </div>

                {isExtracting && (
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-slate-400">Extracting details...</span>
                      <span className="text-indigo-400 font-bold">{progress}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <button type="button" disabled={isExtracting} onClick={closeModal} className="rounded-xl px-5 py-3 text-sm font-semibold text-slate-400 hover:bg-slate-800">
                    Cancel
                  </button>
                  <button type="submit" disabled={isExtracting} className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-bold text-white disabled:opacity-50">
                    {isExtracting ? "Extracting..." : "Extract Media"}
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
