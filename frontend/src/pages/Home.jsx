import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Code2,
  Compass,
  FileCode2,
  FileText,
  Flame,
  Globe,
  Hash,
  Image as ImageIcon,
  Layers,
  MessageSquare,
  Network,
  Palette,
  Search,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Wrench,
  X,
} from "lucide-react";

const API_URL = "https://myblogs-fr9t.onrender.com/api/blogs";

const DEFAULT_PAGINATION = {
  currentPage: 1,
  limit: 12,
  totalBlogs: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
};

/* =========================================================
   TOOL ITEMS (Sorted in Ascending Order by default)
========================================================= */
const INITIAL_TOOLS = [
  {
    id: "api-tester",
    name: "API Tester",
    category: "Network",
    path: "/postman",
    icon: Network,
    status: "Active",
    desc: "Test REST API endpoints and inspect payloads",
  },
  {
    id: "base64-converter",
    name: "Base64 Encoder / Decoder",
    category: "Converter",
    path: "/tools/base64",
    icon: FileCode2,
    status: "Active",
    desc: "Encode strings and files to Base64 format",
  },
  {
    id: "color-palette",
    name: "Color Palette Picker",
    category: "Design",
    path: "/tools/color-picker",
    icon: Palette,
    status: "Active",
    desc: "HEX, RGB & HSL harmony converter",
  },
  {
    id: "hash-generator",
    name: "Hash & HMAC Generator",
    category: "Security",
    path: "/tools/hash-generator",
    icon: Hash,
    status: "Active",
    desc: "Generate SHA-256, MD5, and HMAC hashes",
  },
  {
    id: "json-formatter",
    name: "JSON Formatter & Validator",
    category: "Developer",
    path: "/tools/json-formatter",
    icon: Code2,
    status: "Active",
    desc: "Format, validate, and minify JSON trees",
  },
  {
    id: "markdown-editor",
    name: "Markdown Live Editor",
    category: "Writer",
    path: "/tools/markdown-editor",
    icon: FileText,
    status: "Active",
    desc: "Real-time Markdown editor with live preview",
  },
  {
    id: "slug-generator",
    name: "Slug & URL Beautifier",
    category: "SEO",
    path: "/tools/slug-generator",
    icon: Globe,
    status: "Active",
    desc: "Create SEO-friendly URI slugs with 1 click",
  },
  {
    id: "word-counter",
    name: "Word & Read Time Counter",
    category: "Writer",
    path: "/tools/word-counter",
    icon: Layers,
    status: "Active",
    desc: "Analyze word count, sentences, and read-time",
  },
];

/* =========================================================
   HELPERS
========================================================= */

const formatDate = (date, options = {}) => {
  try {
    return new Date(date || Date.now()).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      ...options,
    });
  } catch {
    return "";
  }
};

const getCommentCount = (blog) => {
  if (typeof blog?.commentsCount === "number") return blog.commentsCount;
  if (Array.isArray(blog?.comments)) return blog.comments.length;
  return 0;
};

/* =========================================================
   IMAGE PLACEHOLDER
========================================================= */

function ImagePlaceholder({ large = false }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
      <div
        className={`flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] ${
          large ? "h-14 w-14" : "h-10 w-10"
        }`}
      >
        <ImageIcon
          className={`text-slate-500 ${large ? "h-6 w-6" : "h-4 w-4"}`}
        />
      </div>
    </div>
  );
}

/* =========================================================
   LOADING SKELETON
========================================================= */

function HomeSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="h-[360px] rounded-2xl border border-white/10 bg-white/[0.03] lg:col-span-8" />
        <div className="space-y-3 lg:col-span-4">
          <div className="h-5 w-28 rounded bg-white/[0.05]" />
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3"
            >
              <div className="h-16 w-20 shrink-0 rounded-lg bg-white/[0.06]" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-full rounded bg-white/[0.06]" />
                <div className="h-3 w-3/4 rounded bg-white/[0.06]" />
                <div className="h-2 w-1/2 rounded bg-white/[0.04]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
          <div
            key={item}
            className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
          >
            <div className="h-36 bg-white/[0.05]" />
            <div className="space-y-2.5 p-3.5">
              <div className="h-2.5 w-1/3 rounded bg-white/[0.06]" />
              <div className="h-3.5 w-full rounded bg-white/[0.06]" />
              <div className="h-2.5 w-4/5 rounded bg-white/[0.04]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   COMPACT ARTICLE CARD (Small Size & Dense Layout)
========================================================= */

function ArticleCard({ blog }) {
  const comments = getCommentCount(blog);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] shadow-md shadow-black/20 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-orange-500/30 hover:bg-white/[0.05] hover:shadow-orange-950/20">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900">
        <div className="absolute left-2.5 top-2.5 z-20">
          <span className="rounded-md border border-orange-400/20 bg-black/70 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-orange-300 backdrop-blur-md">
            {blog.category || "General"}
          </span>
        </div>

        {blog.coverImage ? (
          <img
            src={blog.coverImage}
            alt={blog.title || "Article"}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <ImagePlaceholder />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#070816]/90 via-transparent to-transparent opacity-80" />

        <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[9px] font-medium text-slate-300">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3 text-orange-400" />
            {formatDate(blog.createdAt)}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3 text-amber-400" />
            {comments}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between p-3.5">
        <div>
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-white transition-colors duration-200 group-hover:text-orange-300">
            <Link to={`/blogs/${blog.slug}`}>{blog.title}</Link>
          </h3>

          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-400">
            {blog.excerpt ||
              "Read the complete post to discover key takeaways and insights."}
          </p>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2.5 text-[10px]">
          <span className="max-w-[100px] truncate font-medium text-slate-400">
            {blog.author || "MyBlog"}
          </span>

          <Link
            to={`/blogs/${blog.slug}`}
            className="inline-flex items-center gap-1 font-bold text-orange-300 hover:text-orange-200"
          >
            Read
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

/* =========================================================
   COMPACT TRENDING CARD
========================================================= */

function TrendingCard({ blog, index }) {
  return (
    <article className="group relative flex gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-2.5 backdrop-blur-md transition-all duration-200 hover:border-orange-400/30 hover:bg-white/[0.05]">
      <div className="flex w-4 shrink-0 items-start justify-center pt-0.5">
        <span className="text-xs font-black text-slate-600 transition-colors group-hover:text-orange-400">
          0{index + 1}
        </span>
      </div>

      <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-900">
        {blog.coverImage ? (
          <img
            src={blog.coverImage}
            alt={blog.title || "Article"}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <ImagePlaceholder />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <h4 className="line-clamp-2 text-xs font-semibold leading-snug text-slate-200 transition-colors group-hover:text-orange-300">
          <Link to={`/blogs/${blog.slug}`}>{blog.title}</Link>
        </h4>

        <div className="mt-1.5 flex items-center gap-2.5 text-[9px] text-slate-400">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-2.5 w-2.5 text-orange-400" />
            {formatDate(blog.createdAt, { year: undefined })}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-2.5 w-2.5 text-amber-400" />
            {getCommentCount(blog)}
          </span>
        </div>
      </div>
    </article>
  );
}

/* =========================================================
   RECTANGLE SMALL TOOL CARD COMPONENT
========================================================= */

function SmallToolCard({ tool }) {
  const Icon = tool.icon;

  return (
    <Link
      to={tool.path}
      className="group relative flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-2.5 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-500/40 hover:bg-white/[0.06] hover:shadow-lg hover:shadow-orange-950/20"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 text-orange-400 group-hover:border-orange-500/30 group-hover:scale-105 transition-all">
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="truncate text-xs font-bold text-slate-200 transition-colors group-hover:text-orange-300">
            {tool.name}
          </h4>
          <span className="inline-flex items-center rounded bg-emerald-500/10 px-1.5 py-0.2 text-[8px] font-bold text-emerald-400 border border-emerald-500/20">
            {tool.status}
          </span>
        </div>
        <p className="truncate text-[10px] text-slate-400">{tool.desc}</p>
      </div>

      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-orange-400" />
    </Link>
  );
}

/* =========================================================
   HOME COMPONENT
========================================================= */

export default function Home() {
  const heroRef = useRef(null);

  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);

  // Focus hero on initial load
  useEffect(() => {
    if (heroRef.current) {
      heroRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const fetchBlogs = async (page) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}?status=published&page=${page}&limit=12`,
        { timeout: 15000 }
      );

      if (response.data?.success) {
        const fetchedBlogs = response.data.blogs || [];
        setBlogs(fetchedBlogs);

        const apiPagination = response.data.pagination;
        setPagination(
          apiPagination || {
            currentPage: Number(page),
            limit: 12,
            totalBlogs: response.data.total || fetchedBlogs.length || 0,
            totalPages: response.data.totalPages || 1,
            hasNextPage:
              response.data.hasNextPage ??
              Number(page) < Number(response.data.totalPages || 1),
            hasPreviousPage:
              response.data.hasPreviousPage ?? Number(page) > 1,
          }
        );
      } else {
        setBlogs([]);
        setPagination(DEFAULT_PAGINATION);
      }
    } catch (error) {
      console.error("Home blogs fetch error:", error);
      setBlogs([]);
      setPagination(DEFAULT_PAGINATION);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs(currentPage);
  }, [currentPage]);

  // Sort active tools in Alphabetical Ascending order (A-Z)
  const activeSortedTools = useMemo(() => {
    return [...INITIAL_TOOLS]
      .filter((tool) => tool.status === "Active")
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(blogs.map((b) => b.category).filter(Boolean))
    );
    return ["All", ...uniqueCategories];
  }, [blogs]);

  const filteredBlogs = useMemo(() => {
    const search = searchQuery.toLowerCase().trim();
    return blogs.filter((blog) => {
      const matchesCategory =
        selectedCategory === "All" || blog.category === selectedCategory;

      const matchesSearch =
        !search ||
        blog.title?.toLowerCase().includes(search) ||
        blog.excerpt?.toLowerCase().includes(search) ||
        blog.author?.toLowerCase().includes(search) ||
        blog.category?.toLowerCase().includes(search);

      return matchesCategory && matchesSearch;
    });
  }, [blogs, selectedCategory, searchQuery]);

  const heroBlog = filteredBlogs.length > 0 ? filteredBlogs[0] : null;
  const sidebarBlogs = filteredBlogs.length > 1 ? filteredBlogs.slice(1, 4) : [];
  const gridBlogs = filteredBlogs.length > 4 ? filteredBlogs.slice(4) : [];

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setCurrentPage(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages || newPage === currentPage)
      return;
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("All");
    setCurrentPage(1);
  };

  return (
    <div className="relative min-h-screen bg-[#070816] text-white pb-20 font-sans selection:bg-orange-500/30 selection:text-orange-200">
      {/* Background ambient light */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-[450px] w-[450px] rounded-full bg-orange-600/10 blur-[120px]" />
        <div className="absolute right-[-100px] top-[20%] h-[450px] w-[450px] rounded-full bg-indigo-600/10 blur-[140px]" />
      </div>

      {/* Header & Search */}
      <header className="relative z-10 mx-auto max-w-7xl px-4 pt-8 pb-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-3.5 inline-flex items-center gap-1.5 rounded-full border border-orange-400/20 bg-orange-400/[0.08] px-3.5 py-1 text-[10px] font-bold uppercase tracking-widest text-orange-300 backdrop-blur-md">
            <Sparkles className="h-3 w-3" />
            Discover & Explore
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Insights, Stories &{" "}
            <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400 bg-clip-text text-transparent">
              Smart Tools.
            </span>
          </h1>

          {/* Search Box */}
          <div className="mx-auto mt-6 max-w-xl">
            <div className="relative flex items-center rounded-xl border border-white/10 bg-slate-900/80 px-3.5 py-2.5 shadow-xl shadow-black/20 backdrop-blur-md focus-within:border-orange-400/40">
              <Search className="mr-2.5 h-4 w-4 shrink-0 text-orange-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles, tools, or keywords..."
                className="w-full bg-transparent text-xs sm:text-sm text-white placeholder:text-slate-500 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        {/* =========================================================
            ACTIVE TOOLS SECTION (Sorted A-Z, Small Rectangles)
        ========================================================= */}
        <section className="mb-8 mt-2 rounded-2xl border border-white/10 bg-slate-950/40 p-4 backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
                <Wrench className="h-3.5 w-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                  Developer & Writer Tools
                </h3>
                <p className="text-[10px] text-slate-400">
                  Active tools sorted in ascending order (A–Z)
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-orange-400">
              <SlidersHorizontal className="h-3 w-3" />
              {activeSortedTools.length} Active
            </div>
          </div>

          {/* Small Rectangle Cards Grid */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {activeSortedTools.map((tool) => (
              <SmallToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </section>

        {/* Categories Bar */}
        <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <div className="mr-2 flex shrink-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <Compass className="h-3.5 w-3.5 text-orange-400" />
            Topics:
          </div>

          {categories.map((category) => {
            const active = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => handleCategoryChange(category)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all duration-200 ${
                  active
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm shadow-orange-500/30"
                    : "border border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        {loading ? (
          <HomeSkeleton />
        ) : filteredBlogs.length === 0 ? (
          <div className="my-10 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center">
            <Search className="mx-auto h-8 w-8 text-orange-400/80" />
            <h3 className="mt-4 text-base font-bold text-white">No articles found</h3>
            <p className="mt-1 text-xs text-slate-400">
              Try adjusting your keyword or category filter.
            </p>
            <button
              onClick={resetFilters}
              className="mt-5 rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <>
            {/* =========================================================
                FEATURED HERO (Focused on Page Load) + TRENDING
            ========================================================= */}
            {heroBlog && (
              <section
                ref={heroRef}
                tabIndex="-1"
                className="grid grid-cols-1 gap-5 lg:grid-cols-12 focus:outline-none"
              >
                {/* Hero Feature */}
                <article className="group relative min-h-[340px] sm:min-h-[380px] overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-xl lg:col-span-8 flex flex-col justify-end">
                  <div className="absolute inset-0">
                    {heroBlog.coverImage ? (
                      <img
                        src={heroBlog.coverImage}
                        alt={heroBlog.title || "Featured"}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <ImagePlaceholder large />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#070816] via-[#070816]/70 to-transparent" />
                  </div>

                  <div className="absolute left-4 top-4 z-20">
                    <span className="inline-flex items-center gap-1 rounded-md border border-orange-400/30 bg-black/60 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-orange-300 backdrop-blur-md">
                      <Flame className="h-3 w-3" />
                      Featured
                    </span>
                  </div>

                  {/* Hero Details */}
                  <div className="relative z-10 p-5 sm:p-7">
                    <div className="flex items-center gap-3 text-[10px] text-slate-300">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3 text-orange-400" />
                        {formatDate(heroBlog.createdAt)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3 text-amber-400" />
                        {getCommentCount(heroBlog)} comments
                      </span>
                    </div>

                    <h2 className="mt-2.5 max-w-2xl text-xl sm:text-2xl lg:text-3xl font-extrabold leading-snug text-white group-hover:text-orange-200 transition-colors">
                      <Link to={`/blogs/${heroBlog.slug}`}>
                        {heroBlog.title}
                      </Link>
                    </h2>

                    <p className="mt-2 max-w-xl line-clamp-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {heroBlog.excerpt ||
                        "Dive in to read this comprehensive post and gain fresh perspectives."}
                    </p>

                    <div className="mt-4 flex items-center justify-between">
                      <Link
                        to={`/blogs/${heroBlog.slug}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:scale-[1.02] transition-transform"
                      >
                        Read Full Story
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>

                      <span className="text-[10px] text-slate-400">
                        By {heroBlog.author || "Editor"}
                      </span>
                    </div>
                  </div>
                </article>

                {/* Trending Stories Sidebar */}
                <aside className="flex flex-col lg:col-span-4">
                  <div className="mb-2.5 flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-orange-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                        Trending Stories
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-2.5">
                    {sidebarBlogs.length > 0 ? (
                      sidebarBlogs.map((blog, index) => (
                        <TrendingCard
                          key={blog._id || blog.slug}
                          blog={blog}
                          index={index}
                        />
                      ))
                    ) : (
                      <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-slate-500">
                        No trending stories available
                      </div>
                    )}
                  </div>
                </aside>
              </section>
            )}

            {/* Small Compact Articles Grid Section */}
            {gridBlogs.length > 0 && (
              <section className="mt-10">
                <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                    Latest Articles
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {gridBlogs.length} Stories
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {gridBlogs.map((blog) => (
                    <ArticleCard key={blog._id || blog.slug} blog={blog} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Compact Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-2 border-t border-white/10 pt-6">
            <button
              type="button"
              disabled={!pagination.hasPreviousPage}
              onClick={() => handlePageChange(currentPage - 1)}
              className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs font-semibold text-slate-400 hover:bg-white/[0.08] hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </button>

            <div className="flex items-center gap-1">
              <span className="px-3 text-xs font-bold text-slate-300">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
            </div>

            <button
              type="button"
              disabled={!pagination.hasNextPage}
              onClick={() => handlePageChange(currentPage + 1)}
              className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs font-semibold text-slate-400 hover:bg-white/[0.08] hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
