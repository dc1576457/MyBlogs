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
} from "lucide-react";

const API_URL = "http://localhost:8000/api/blogs";

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
      // Added limit=10 in API request
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
            hasNextPage: response.data.hasNextPage ?? (page < (response.data.totalPages || 1)),
            hasPreviousPage: response.data.hasPreviousPage ?? (page > 1),
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
        selectedCategory === "All" ||
        blog.category === selectedCategory;

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
  const heroBlog =
    filteredBlogs.length > 0 ? filteredBlogs[0] : null;

  const sidebarBlogs =
    filteredBlogs.length > 1
      ? filteredBlogs.slice(1, 4)
      : [];

  const gridBlogs =
    filteredBlogs.length > 4
      ? filteredBlogs.slice(4)
      : [];

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setCurrentPage(1);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 text-white font-sans pb-24 selection:bg-orange-500/30 selection:text-orange-200 relative overflow-x-hidden">

      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[350px] bg-gradient-to-tr from-amber-500/10 via-orange-600/10 to-transparent rounded-full blur-[120px] pointer-events-none" />

      <div className="absolute top-1/2 right-10 w-[450px] h-[450px] bg-gradient-to-br from-orange-600/10 to-amber-600/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Hero Header Area */}
      <header className="relative pt-12 pb-8 px-4 sm:px-6 max-w-7xl mx-auto text-center">

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
          Curated Thoughts for <br className="hidden sm:block" />

          <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400 bg-clip-text text-transparent">
            Modern Creators & Thinkers.
          </span>
        </h1>

        {/* Global Floating Search Bar */}
        <div className="mt-8 max-w-2xl mx-auto">
          <div className="relative group">

            <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-300 pointer-events-none" />

            <div className="relative flex items-center bg-slate-950/70 border border-white/10 rounded-2xl shadow-2xl overflow-hidden px-4 py-3 backdrop-blur-md">

              <Search className="w-5 h-5 mr-3 text-orange-400 shrink-0" />

              <input
                type="text"
                placeholder="Search articles, keywords, or authors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm sm:text-base text-white placeholder-slate-500 outline-none border-none focus:ring-0"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-xs font-bold text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-slate-800 transition"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">

        {/* Category Navigation Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-10 no-scrollbar border-b border-white/10">

          <div className="flex items-center gap-1.5 mr-2 text-slate-400 font-bold text-xs uppercase tracking-wider shrink-0">
            <Compass className="w-4 h-4 text-orange-400" />
            <span>Filter:</span>
          </div>

          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => handleCategoryChange(cat)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all duration-300 ${
                selectedCategory === cat
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25 scale-105 border border-orange-400/30"
                  : "bg-slate-950/60 text-slate-400 border border-white/5 hover:bg-indigo-950/80 hover:text-white hover:border-orange-500/30"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Content Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          <div className="lg:col-span-12 space-y-12">

            {/* Loading */}
            {loading ? (
              <div className="space-y-6 animate-pulse">

                <div className="h-72 sm:h-[420px] bg-slate-950/70 rounded-3xl border border-white/5" />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="h-64 bg-slate-950/70 rounded-2xl border border-white/5"
                    />
                  ))}
                </div>

              </div>
            ) : filteredBlogs.length === 0 ? (

              /* No Articles */
              <div className="rounded-3xl border border-dashed border-white/10 bg-slate-950/50 p-16 text-center backdrop-blur-md">

                <Sparkles className="w-10 h-10 mx-auto text-amber-400 animate-bounce mb-3" />

                <h3 className="text-lg font-bold text-slate-200 uppercase tracking-wide">
                  No Articles Found
                </h3>

                <p className="mt-2 text-xs text-slate-400 max-w-sm mx-auto">
                  We couldn't find any articles matching your filters.
                  Try resetting search criteria.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("All");
                  }}
                  className="mt-6 px-6 py-3 rounded-xl bg-slate-900 hover:bg-orange-600 font-semibold text-xs text-white transition border border-slate-700 shadow-md"
                >
                  Reset All Filters
                </button>

              </div>
            ) : (

              <>
                {/* Hero Showcase Section */}
                {heroBlog && (
                  <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

                    {/* Main Hero Card */}
                    <div className="lg:col-span-8 relative bg-gradient-to-b from-slate-950/90 via-indigo-950/80 to-purple-950/80 rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col justify-between group">

                      <div className="absolute top-4 left-4 z-20 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-widest shadow-lg">
                        {heroBlog.category || "Featured Article"}
                      </div>

                      <div className="absolute inset-0 z-0 overflow-hidden">

                        {heroBlog.coverImage ? (
                          <img
                            src={heroBlog.coverImage}
                            alt={heroBlog.title}
                            className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-all duration-700 ease-out"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-950 text-slate-600">
                            <ImageIcon className="w-12 h-12" />
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-indigo-950/70 to-transparent" />
                      </div>

                      <div className="mt-auto relative z-10 p-6 sm:p-8 space-y-4">

                        <div className="flex items-center gap-3 text-xs text-slate-300 font-medium">

                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-orange-400" />

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
                            <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                            {heroBlog.commentsCount || 0} Comments
                          </span>

                        </div>

                        <h2 className="text-xl sm:text-3xl font-black text-white leading-snug group-hover:text-amber-300 transition-colors">

                          <Link to={`/blogs/${heroBlog.slug}`}>
                            {heroBlog.title}
                          </Link>

                        </h2>

                        <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 max-w-2xl leading-relaxed">
                          {heroBlog.excerpt ||
                            "Explore the comprehensive deep-dive into this topic with our carefully written journal post."}
                        </p>

                        <div className="pt-2 flex items-center justify-between">

                          <Link
                            to={`/blogs/${heroBlog.slug}`}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-lg shadow-orange-600/30 transition"
                          >
                            <span>Read Full Story</span>
                            <ArrowUpRight className="w-4 h-4" />
                          </Link>

                          {/* Hero Pagination */}
                          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-white/10">

                            <button
                              type="button"
                              onClick={() =>
                                pagination.hasPreviousPage &&
                                handlePageChange(currentPage - 1)
                              }
                              disabled={!pagination.hasPreviousPage}
                              className="p-2 rounded-lg bg-slate-900 text-slate-300 hover:bg-orange-500 hover:text-white transition disabled:opacity-20"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>

                            <span className="px-3 text-xs font-bold text-slate-300">
                              {pagination.currentPage} /{" "}
                              {pagination.totalPages}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                pagination.hasNextPage &&
                                handlePageChange(currentPage + 1)
                              }
                              disabled={!pagination.hasNextPage}
                              className="p-2 rounded-lg bg-slate-900 text-slate-300 hover:bg-orange-500 hover:text-white transition disabled:opacity-20"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>

                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Secondary Sidebar Posts */}
                    <div className="lg:col-span-4 flex flex-col gap-4 justify-between">

                      <div className="flex items-center gap-2 px-1">
                        <Flame className="w-4 h-4 text-orange-500" />

                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                          Trending Stories
                        </h3>
                      </div>

                      <div className="space-y-3 flex-1 flex flex-col justify-between">

                        {sidebarBlogs.map((blog) => (
                          <article
                            key={blog._id}
                            className="flex gap-4 bg-slate-950/60 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 hover:border-orange-500/40 transition-all group"
                          >

                            <div className="w-24 h-20 bg-slate-900 rounded-xl shrink-0 overflow-hidden relative">

                              {blog.coverImage ? (
                                <img
                                  src={blog.coverImage}
                                  alt={blog.title}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-600">
                                  <ImageIcon className="w-4 h-4" />
                                </div>
                              )}

                            </div>

                            <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1.5">

                              <h4 className="text-xs font-bold text-slate-200 leading-snug line-clamp-2 group-hover:text-amber-300 transition-colors">

                                <Link to={`/blogs/${blog.slug}`}>
                                  {blog.title}
                                </Link>

                              </h4>

                              <div className="flex items-center gap-3 text-[10px] text-slate-400">

                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-orange-400" />

                                  {new Date(
                                    blog.createdAt || Date.now()
                                  ).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>

                                <span className="flex items-center gap-1">
                                  <MessageSquare className="w-3 h-3 text-amber-400" />
                                  {blog.commentsCount || 0}
                                </span>

                              </div>
                            </div>
                          </article>
                        ))}

                      </div>
                    </div>
                  </section>
                )}

                {/* Grid Section (Shows remaining blogs up to 10 per page) */}
                {gridBlogs.length > 0 && (
                  <section className="space-y-6 pt-6">

                    <div className="flex items-center justify-between border-b border-white/10 pb-3">

                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-amber-400" />

                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-100">
                          Latest Journal Entries
                        </h3>
                      </div>

                      <span className="text-xs text-slate-400 font-semibold">
                        Showing {gridBlogs.length} articles
                      </span>

                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

                      {gridBlogs.map((blog) => (

                        <article
                          key={blog._id}
                          className="bg-slate-950/60 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden hover:border-orange-500/40 transition-all duration-300 flex flex-col group shadow-xl hover:-translate-y-1"
                        >

                          <div className="relative w-full h-52 bg-slate-900 overflow-hidden shrink-0">

                            <div className="absolute top-3 left-3 z-10 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-full shadow-md tracking-wider">
                              {blog.category || "Article"}
                            </div>

                            {blog.coverImage ? (
                              <img
                                src={blog.coverImage}
                                alt={blog.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
                                <ImageIcon className="w-6 h-6" />
                              </div>
                            )}

                          </div>

                          <div className="p-5 flex-1 flex flex-col justify-between space-y-4">

                            <div className="space-y-2">

                              <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">

                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-orange-400" />

                                  {new Date(
                                    blog.createdAt || Date.now()
                                  ).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </span>

                                <span>•</span>

                                <span className="flex items-center gap-1">
                                  <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                                  {blog.commentsCount || 0}
                                </span>

                              </div>

                              <h3 className="text-base font-bold text-slate-100 leading-snug group-hover:text-amber-300 transition-colors line-clamp-2">

                                <Link to={`/blogs/${blog.slug}`}>
                                  {blog.title}
                                </Link>

                              </h3>

                              <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                                {blog.excerpt ||
                                  "Read more about this article inside our digital magazine archive."}
                              </p>

                            </div>
                          </div>

                        </article>
                      ))}

                    </div>
                  </section>
                )}
              </>
            )}

            {/* Bottom Pagination Panel */}
            {pagination.totalPages > 1 && (
              <div className="pt-10 border-t border-white/10 flex items-center justify-center gap-2 flex-wrap">

                <button
                  type="button"
                  disabled={!pagination.hasPreviousPage}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="px-4 py-2.5 text-xs font-bold uppercase text-slate-300 bg-slate-950/70 border border-white/10 rounded-xl hover:bg-orange-500 hover:text-white disabled:opacity-30 transition-all flex items-center gap-1.5 shadow-md"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-white/10">

                  {Array.from(
                    { length: pagination.totalPages },
                    (_, index) => index + 1
                  ).map((page) => (

                    <button
                      key={page}
                      type="button"
                      onClick={() => handlePageChange(page)}
                      className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${
                        currentPage === page
                          ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20"
                          : "text-slate-400 hover:bg-indigo-950 hover:text-white"
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
                  className="px-4 py-2.5 text-xs font-bold uppercase text-slate-300 bg-slate-950/70 border border-white/10 rounded-xl hover:bg-orange-500 hover:text-white disabled:opacity-30 transition-all flex items-center gap-1.5 shadow-md"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>

              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}