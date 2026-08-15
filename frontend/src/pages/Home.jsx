import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  Clock,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Search,
  Sparkles,
  ArrowUpRight,
  Flame,
  Compass,
  TrendingUp,
  X,
  BookOpen,
} from "lucide-react";

const API_URL = "https://myblogs-fr9t.onrender.com/api/blogs";

export default function Home() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    limit: 10,
    totalBlogs: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const fetchBlogs = async (page) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}?status=published&page=${page}&limit=10`
      );

      if (response.data?.success) {
        setBlogs(response.data.blogs || []);
        setPagination(
          response.data.pagination || {
            currentPage: Number(page),
            limit: 10,
            totalBlogs: response.data.total || response.data.blogs?.length || 0,
            totalPages: response.data.totalPages || 1,
            hasNextPage:
              response.data.hasNextPage ??
              page < (response.data.totalPages || 1),
            hasPreviousPage: response.data.hasPreviousPage ?? page > 1,
          }
        );
      }
    } catch (error) {
      console.error("Home blogs fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs(currentPage);
  }, [currentPage]);

  const categories = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set(blogs.map((blog) => blog.category).filter(Boolean))
      ),
    ];
  }, [blogs]);

  const filteredBlogs = useMemo(() => {
    return blogs.filter((blog) => {
      const matchesCategory =
        selectedCategory === "All" || blog.category === selectedCategory;

      const search = searchQuery.toLowerCase().trim();

      const matchesSearch =
        !search ||
        blog.title?.toLowerCase().includes(search) ||
        blog.excerpt?.toLowerCase().includes(search) ||
        blog.author?.toLowerCase().includes(search);

      return matchesCategory && matchesSearch;
    });
  }, [blogs, selectedCategory, searchQuery]);

  // 1 Hero Blog + 3 Sidebar Blogs + 6 Grid Blogs = 10 Blogs per page
  const heroBlog = filteredBlogs.length > 0 ? filteredBlogs[0] : null;
  const sidebarBlogs =
    filteredBlogs.length > 1 ? filteredBlogs.slice(1, 4) : [];
  const gridBlogs = filteredBlogs.length > 4 ? filteredBlogs.slice(4) : [];

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setCurrentPage(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#070816] text-white font-sans pb-24 selection:bg-orange-500/30 selection:text-orange-200 relative overflow-x-hidden">
      {/* Background Ambient Glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-orange-600/10 blur-[140px]" />
        <div className="absolute right-[-120px] top-[25%] h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[150px]" />
        <div className="absolute bottom-[-100px] left-[30%] h-[450px] w-[450px] rounded-full bg-purple-600/10 blur-[140px]" />
      </div>

      {/* Header Area */}
      <header className="relative z-10 mx-auto max-w-7xl px-4 pt-12 pb-8 sm:px-6 text-center">
        {/* Sub-badge */}
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-orange-400/20 bg-orange-400/[0.08] px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-orange-300 backdrop-blur-md">
          <Sparkles className="h-3 w-3" />
          The Digital Magazine
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
          Curated Thoughts for <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400 bg-clip-text text-transparent">
            Modern Creators & Thinkers.
          </span>
        </h1>

        {/* Global Floating Search Bar */}
        <div className="mt-7 max-w-xl mx-auto">
          <div className="group relative">
            <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-orange-500/30 via-amber-500/20 to-purple-500/20 opacity-60 blur-md transition duration-300 group-focus-within:opacity-100" />
            <div className="relative flex items-center rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 shadow-2xl backdrop-blur-xl focus-within:border-orange-400/50">
              <Search className="h-4 w-4 mr-3 text-orange-400 shrink-0" />
              <input
                type="text"
                placeholder="Search articles, topics, or authors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-500 outline-none border-none focus:ring-0"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        {/* Category Navigation Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-white/10">
          <div className="flex items-center gap-1.5 mr-2 text-slate-400 font-bold text-xs uppercase tracking-wider shrink-0">
            <Compass className="h-4 w-4 text-orange-400" />
            <span>Topics:</span>
          </div>

          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => handleCategoryChange(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200 ${
                selectedCategory === cat
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25 border border-orange-400/30"
                  : "border border-white/10 bg-white/[0.025] text-slate-400 hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Content Layout */}
        {loading ? (
          /* Skeletons */
          <div className="space-y-8 animate-pulse">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              <div className="h-[360px] rounded-3xl border border-white/10 bg-white/[0.03] lg:col-span-8" />
              <div className="space-y-3 lg:col-span-4">
                <div className="h-5 w-28 rounded bg-white/[0.05]" />
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3"
                  >
                    <div className="h-16 w-20 shrink-0 rounded-xl bg-white/[0.06]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-full rounded bg-white/[0.06]" />
                      <div className="h-3 w-3/4 rounded bg-white/[0.06]" />
                      <div className="h-2 w-1/2 rounded bg-white/[0.04]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-72 rounded-2xl border border-white/10 bg-white/[0.03]"
                />
              ))}
            </div>
          </div>
        ) : filteredBlogs.length === 0 ? (
          /* Empty State */
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-16 text-center backdrop-blur-xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-400/20 bg-orange-400/10 text-orange-400 mb-4">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-white uppercase tracking-wider">
              No Articles Found
            </h3>
            <p className="mt-1.5 text-xs text-slate-400 max-w-sm mx-auto">
              We couldn't find any articles matching your search. Try resetting
              your filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("All");
              }}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 font-bold text-xs text-white shadow-md shadow-orange-500/20 hover:scale-[1.02] transition"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Hero Showcase Section */}
            {heroBlog && (
              <section className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-stretch">
                {/* Main Hero Card */}
                <article className="lg:col-span-8 group relative min-h-[380px] overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl flex flex-col justify-end">
                  {/* Cover Background */}
                  <div className="absolute inset-0 z-0">
                    {heroBlog.coverImage ? (
                      <img
                        src={heroBlog.coverImage}
                        alt={heroBlog.title}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-900 text-slate-600">
                        <ImageIcon className="h-12 w-12" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#070816] via-[#070816]/75 to-transparent" />
                  </div>

                  {/* Category Pill */}
                  <div className="absolute top-4 left-4 z-20">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-400/30 bg-black/60 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-orange-300 backdrop-blur-md">
                      <Flame className="h-3 w-3" />
                      {heroBlog.category || "Featured"}
                    </span>
                  </div>

                  {/* Hero Details */}
                  <div className="relative z-10 p-6 sm:p-8">
                    <div className="flex items-center gap-3 text-[11px] text-slate-300 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-orange-400" />
                        {new Date(
                          heroBlog.createdAt || Date.now()
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-amber-400" />
                        {heroBlog.commentsCount || 0} Comments
                      </span>
                    </div>

                    <h2 className="mt-2.5 max-w-2xl text-xl sm:text-3xl font-black leading-snug text-white group-hover:text-orange-200 transition-colors">
                      <Link to={`/blogs/${heroBlog.slug}`}>
                        {heroBlog.title}
                      </Link>
                    </h2>

                    <p className="mt-2 max-w-2xl text-xs sm:text-sm text-slate-300 line-clamp-2 leading-relaxed">
                      {heroBlog.excerpt ||
                        "Explore the comprehensive deep-dive into this topic with our carefully written journal post."}
                    </p>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                      <Link
                        to={`/blogs/${heroBlog.slug}`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/25 transition hover:scale-[1.02]"
                      >
                        <span>Read Full Story</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>

                      {/* Hero Inline Pagination */}
                      <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-slate-950/80 p-1 backdrop-blur-xl">
                        <button
                          type="button"
                          onClick={() =>
                            pagination.hasPreviousPage &&
                            handlePageChange(currentPage - 1)
                          }
                          disabled={!pagination.hasPreviousPage}
                          aria-label="Previous Page"
                          className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition disabled:opacity-20"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>

                        <span className="px-2.5 text-[11px] font-bold text-slate-300">
                          {pagination.currentPage} / {pagination.totalPages}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            pagination.hasNextPage &&
                            handlePageChange(currentPage + 1)
                          }
                          disabled={!pagination.hasNextPage}
                          aria-label="Next Page"
                          className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition disabled:opacity-20"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>

                {/* Trending Sidebar */}
                <aside className="lg:col-span-4 flex flex-col justify-between">
                  <div className="mb-2.5 flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5">
                      <Flame className="h-4 w-4 text-orange-400" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-white">
                        Trending Stories
                      </h3>
                    </div>
                    <TrendingUp className="h-3.5 w-3.5 text-slate-500" />
                  </div>

                  <div className="flex flex-1 flex-col gap-2.5 justify-between">
                    {sidebarBlogs.map((blog, idx) => (
                      <article
                        key={blog._id || idx}
                        className="group flex gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-3 backdrop-blur-xl transition-all duration-200 hover:border-orange-400/30 hover:bg-white/[0.05]"
                      >
                        {/* Number Index */}
                        <div className="flex w-4 shrink-0 items-start justify-center pt-1">
                          <span className="text-xs font-black text-slate-600 transition-colors group-hover:text-orange-400">
                            0{idx + 1}
                          </span>
                        </div>

                        {/* Thumbnail */}
                        <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-900">
                          {blog.coverImage ? (
                            <img
                              src={blog.coverImage}
                              alt={blog.title}
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-600">
                              <ImageIcon className="h-4 w-4" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1 flex flex-col justify-center">
                          <h4 className="line-clamp-2 text-xs font-bold leading-snug text-slate-200 transition-colors group-hover:text-orange-300">
                            <Link to={`/blogs/${blog.slug}`}>{blog.title}</Link>
                          </h4>

                          <div className="mt-1.5 flex items-center gap-2.5 text-[9px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5 text-orange-400" />
                              {new Date(
                                blog.createdAt || Date.now()
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-2.5 w-2.5 text-amber-400" />
                              {blog.commentsCount || 0}
                            </span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </aside>
              </section>
            )}

            {/* Grid Section (Remaining 6 Blogs) */}
            {gridBlogs.length > 0 && (
              <section className="pt-2">
                <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-orange-400" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">
                      Latest Journal Entries
                    </h3>
                  </div>

                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[10px] font-bold text-slate-400">
                    {gridBlogs.length} articles
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {gridBlogs.map((blog) => (
                    <article
                      key={blog._id}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-orange-500/30 hover:bg-white/[0.05]"
                    >
                      {/* Image Container */}
                      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900">
                        <div className="absolute top-2.5 left-2.5 z-10">
                          <span className="rounded-md border border-orange-400/20 bg-black/70 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-orange-300 backdrop-blur-md">
                            {blog.category || "Article"}
                          </span>
                        </div>

                        {blog.coverImage ? (
                          <img
                            src={blog.coverImage}
                            alt={blog.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-600">
                            <ImageIcon className="h-6 w-6" />
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-[#070816]/90 via-transparent to-transparent opacity-80" />

                        <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[9px] font-medium text-slate-300">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-orange-400" />
                            {new Date(
                              blog.createdAt || Date.now()
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3 text-amber-400" />
                            {blog.commentsCount || 0}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex flex-1 flex-col justify-between p-4 space-y-3">
                        <div>
                          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-white group-hover:text-orange-300 transition-colors">
                            <Link to={`/blogs/${blog.slug}`}>{blog.title}</Link>
                          </h3>

                          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-400">
                            {blog.excerpt ||
                              "Read the complete story inside our digital magazine archive."}
                          </p>
                        </div>

                        <div className="flex items-center justify-between border-t border-white/5 pt-2.5 text-[10px]">
                          <span className="max-w-[120px] truncate text-slate-400 font-medium">
                            By {blog.author || "Editor"}
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
                  ))}
                </div>
              </section>
            )}

            {/* Bottom Pagination Panel */}
            {pagination.totalPages > 1 && (
              <div className="pt-8 border-t border-white/10 flex items-center justify-center gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={!pagination.hasPreviousPage}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.025] px-3.5 py-2 text-xs font-semibold text-slate-400 hover:bg-white/[0.08] hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>

                <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-1">
                  {Array.from(
                    { length: pagination.totalPages },
                    (_, index) => index + 1
                  ).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => handlePageChange(page)}
                      className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${
                        currentPage === page
                          ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20"
                          : "text-slate-400 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={!pagination.hasNextPage}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.025] px-3.5 py-2 text-xs font-semibold text-slate-400 hover:bg-white/[0.08] hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
