import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

import {
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Compass,
  Flame,
  Image as ImageIcon,
  MessageSquare,
  Search,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";

const API_URL = "https://myblogs-fr9t.onrender.com/api/blogs";

const DEFAULT_PAGINATION = {
  currentPage: 1,
  limit: 10,
  totalBlogs: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
};

/* =========================================================
   HELPERS
========================================================= */

const formatDate = (date, options = {}) => {
  try {
    return new Date(date || Date.now()).toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
        ...options,
      }
    );
  } catch {
    return "";
  }
};

const getCommentCount = (blog) => {
  if (typeof blog?.commentsCount === "number") {
    return blog.commentsCount;
  }

  if (Array.isArray(blog?.comments)) {
    return blog.comments.length;
  }

  return 0;
};

/* =========================================================
   IMAGE PLACEHOLDER
========================================================= */

function ImagePlaceholder({ large = false }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950">
      <div
        className={`flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] ${
          large ? "h-20 w-20" : "h-14 w-14"
        }`}
      >
        <ImageIcon
          className={`text-slate-600 ${
            large ? "h-9 w-9" : "h-6 w-6"
          }`}
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
    <div className="space-y-8">
      {/* Hero skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="h-[440px] animate-pulse rounded-[2rem] border border-white/10 bg-white/[0.04] lg:col-span-8" />

        <div className="space-y-4 lg:col-span-4">
          <div className="h-6 w-40 animate-pulse rounded-lg bg-white/[0.05]" />

          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="h-20 w-24 shrink-0 animate-pulse rounded-xl bg-white/[0.06]" />

              <div className="flex-1 space-y-3">
                <div className="h-3 w-full animate-pulse rounded bg-white/[0.06]" />
                <div className="h-3 w-4/5 animate-pulse rounded bg-white/[0.06]" />
                <div className="h-2 w-1/2 animate-pulse rounded bg-white/[0.05]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div
            key={item}
            className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]"
          >
            <div className="h-52 animate-pulse bg-white/[0.05]" />

            <div className="space-y-4 p-5">
              <div className="h-3 w-1/3 animate-pulse rounded bg-white/[0.06]" />
              <div className="h-4 w-full animate-pulse rounded bg-white/[0.06]" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-white/[0.06]" />
              <div className="h-3 w-full animate-pulse rounded bg-white/[0.04]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   ARTICLE CARD
========================================================= */

function ArticleCard({ blog }) {
  const comments = getCommentCount(blog);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.035] shadow-xl shadow-black/10 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1.5 hover:border-orange-400/30 hover:bg-white/[0.055] hover:shadow-orange-950/20">
      {/* Image */}
      <div className="relative h-56 overflow-hidden bg-slate-900">
        <div className="absolute left-4 top-4 z-20">
          <span className="rounded-full border border-orange-300/20 bg-black/60 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-orange-300 backdrop-blur-md">
            {blog.category || "Article"}
          </span>
        </div>

        {blog.coverImage ? (
          <img
            src={blog.coverImage}
            alt={blog.title || "Article"}
            loading="lazy"
            className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
          />
        ) : (
          <ImagePlaceholder />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent opacity-80" />

        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-[10px] font-medium text-slate-300">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-orange-400" />
            {formatDate(blog.createdAt)}
          </span>

          <span className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-amber-400" />
            {comments}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex-1">
          <h3 className="line-clamp-2 text-lg font-extrabold leading-snug text-white transition-colors duration-300 group-hover:text-orange-300">
            <Link to={`/blogs/${blog.slug}`}>
              {blog.title}
            </Link>
          </h3>

          <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-400">
            {blog.excerpt ||
              "Read the complete article and explore more insights from our digital journal."}
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
          <Link
            to={`/blogs/${blog.slug}`}
            className="inline-flex items-center gap-2 text-xs font-bold text-orange-300 transition-colors hover:text-orange-200"
          >
            Read article
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>

          {blog.author && (
            <span className="max-w-[120px] truncate text-[10px] font-medium text-slate-500">
              {blog.author}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

/* =========================================================
   TRENDING CARD
========================================================= */

function TrendingCard({ blog, index }) {
  return (
    <article className="group relative flex gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-3.5 backdrop-blur-xl transition-all duration-300 hover:border-orange-400/30 hover:bg-white/[0.06]">
      <div className="absolute left-0 top-1/2 h-8 w-0.5 -translate-y-1/2 rounded-r-full bg-orange-500 opacity-0 transition-opacity group-hover:opacity-100" />

      {/* Number */}
      <div className="flex w-5 shrink-0 items-start justify-center pt-1">
        <span className="text-sm font-black text-slate-600 transition-colors group-hover:text-orange-400">
          0{index + 1}
        </span>
      </div>

      {/* Image */}
      <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-900">
        {blog.coverImage ? (
          <img
            src={blog.coverImage}
            alt={blog.title || "Article"}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
          />
        ) : (
          <ImagePlaceholder />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <h4 className="line-clamp-2 text-xs font-bold leading-5 text-slate-200 transition-colors group-hover:text-orange-300">
          <Link to={`/blogs/${blog.slug}`}>
            {blog.title}
          </Link>
        </h4>

        <div className="mt-2 flex items-center gap-3 text-[9px] text-slate-500">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3 text-orange-400" />
            {formatDate(blog.createdAt, {
              year: undefined,
            })}
          </span>

          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3 text-amber-400" />
            {getCommentCount(blog)}
          </span>
        </div>
      </div>
    </article>
  );
}

/* =========================================================
   HOME
========================================================= */

export default function Home() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] =
    useState("All");

  const [searchQuery, setSearchQuery] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const [pagination, setPagination] = useState(
    DEFAULT_PAGINATION
  );

  /* =======================================================
     FETCH BLOGS
  ======================================================= */

  const fetchBlogs = async (page) => {
    setLoading(true);

    try {
      const response = await axios.get(
        `${API_URL}?status=published&page=${page}&limit=10`,
        {
          timeout: 15000,
        }
      );

      if (response.data?.success) {
        const fetchedBlogs =
          response.data.blogs || [];

        setBlogs(fetchedBlogs);

        const apiPagination =
          response.data.pagination;

        setPagination(
          apiPagination || {
            currentPage: Number(page),
            limit: 10,
            totalBlogs:
              response.data.total ||
              fetchedBlogs.length ||
              0,
            totalPages:
              response.data.totalPages || 1,
            hasNextPage:
              response.data.hasNextPage ??
              Number(page) <
                Number(
                  response.data.totalPages || 1
                ),
            hasPreviousPage:
              response.data.hasPreviousPage ??
              Number(page) > 1,
          }
        );
      } else {
        setBlogs([]);
        setPagination(DEFAULT_PAGINATION);
      }
    } catch (error) {
      console.error(
        "Home blogs fetch error:",
        error
      );

      setBlogs([]);
      setPagination(DEFAULT_PAGINATION);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs(currentPage);
  }, [currentPage]);

  /* =======================================================
     CATEGORIES
  ======================================================= */

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(
        blogs
          .map((blog) => blog.category)
          .filter(Boolean)
      )
    );

    return ["All", ...uniqueCategories];
  }, [blogs]);

  /* =======================================================
     FILTER
  ======================================================= */

  const filteredBlogs = useMemo(() => {
    const search =
      searchQuery.toLowerCase().trim();

    return blogs.filter((blog) => {
      const matchesCategory =
        selectedCategory === "All" ||
        blog.category === selectedCategory;

      const matchesSearch =
        !search ||
        blog.title
          ?.toLowerCase()
          .includes(search) ||
        blog.excerpt
          ?.toLowerCase()
          .includes(search) ||
        blog.author
          ?.toLowerCase()
          .includes(search) ||
        blog.category
          ?.toLowerCase()
          .includes(search);

      return (
        matchesCategory &&
        matchesSearch
      );
    });
  }, [
    blogs,
    selectedCategory,
    searchQuery,
  ]);

  /* =======================================================
     LAYOUT DATA
  ======================================================= */

  const heroBlog =
    filteredBlogs.length > 0
      ? filteredBlogs[0]
      : null;

  const sidebarBlogs =
    filteredBlogs.length > 1
      ? filteredBlogs.slice(1, 4)
      : [];

  const gridBlogs =
    filteredBlogs.length > 4
      ? filteredBlogs.slice(4)
      : [];

  /* =======================================================
     CATEGORY CHANGE
  ======================================================= */

  const handleCategoryChange = (
    category
  ) => {
    setSelectedCategory(category);
    setCurrentPage(1);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =======================================================
     PAGE CHANGE
  ======================================================= */

  const handlePageChange = (newPage) => {
    if (
      newPage < 1 ||
      newPage > pagination.totalPages ||
      newPage === currentPage
    ) {
      return;
    }

    setCurrentPage(newPage);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =======================================================
     RESET FILTERS
  ======================================================= */

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("All");
    setCurrentPage(1);
  };

  /* =======================================================
     PAGE NUMBERS
  ======================================================= */

  const pageNumbers = useMemo(() => {
    const total =
      Number(pagination.totalPages) || 1;

    const current =
      Number(currentPage) || 1;

    if (total <= 7) {
      return Array.from(
        { length: total },
        (_, index) => index + 1
      );
    }

    if (current <= 4) {
      return [
        1,
        2,
        3,
        4,
        5,
        "...",
        total,
      ];
    }

    if (current >= total - 3) {
      return [
        1,
        "...",
        total - 4,
        total - 3,
        total - 2,
        total - 1,
        total,
      ];
    }

    return [
      1,
      "...",
      current - 1,
      current,
      current + 1,
      "...",
      total,
    ];
  }, [
    currentPage,
    pagination.totalPages,
  ]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#070816] pb-24 font-sans text-white selection:bg-orange-500/30 selection:text-orange-200">
      {/* ===================================================
          BACKGROUND
      =================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-orange-600/10 blur-[130px]" />

        <div className="absolute right-[-180px] top-[30%] h-[550px] w-[550px] rounded-full bg-indigo-600/10 blur-[150px]" />

        <div className="absolute bottom-[-200px] left-[25%] h-[500px] w-[500px] rounded-full bg-purple-600/10 blur-[150px]" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.08),transparent_40%)]" />
      </div>

      {/* ===================================================
          HERO HEADER
      =================================================== */}

      <header className="relative z-10 mx-auto max-w-7xl px-4 pb-10 pt-12 sm:px-6 lg:pt-16">
        <div className="mx-auto max-w-4xl text-center">
          {/* Small Badge */}
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/[0.07] px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-orange-300 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5" />
            MyBlog Journal
          </div>

          <h1 className="text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-7xl">
            Ideas worth
            <br />

            <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400 bg-clip-text text-transparent">
              reading & sharing.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
            Discover thoughtful articles, practical
            guides and fresh ideas created for
            modern learners, creators and thinkers.
          </p>

          {/* =================================================
              SEARCH
          ================================================= */}

          <div className="mx-auto mt-8 max-w-2xl">
            <div className="group relative">
              <div className="absolute -inset-1 rounded-[1.4rem] bg-gradient-to-r from-orange-500/30 via-amber-400/20 to-purple-500/20 opacity-60 blur-lg transition duration-500 group-focus-within:opacity-100" />

              <div className="relative flex items-center overflow-hidden rounded-[1.35rem] border border-white/10 bg-slate-950/75 px-4 py-3.5 shadow-2xl shadow-black/30 backdrop-blur-xl">
                <Search className="mr-3 h-5 w-5 shrink-0 text-orange-400" />

                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) =>
                    setSearchQuery(
                      e.target.value
                    )
                  }
                  placeholder="Search articles, topics or authors..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600 focus:ring-0 sm:text-base"
                />

                {searchQuery && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearchQuery("")
                    }
                    aria-label="Clear search"
                    className="ml-2 rounded-lg p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ===================================================
          MAIN
      =================================================== */}

      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        {/* =================================================
            CATEGORY NAV
        ================================================= */}

        <div className="mb-10 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="mr-1 flex shrink-0 items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              <Compass className="h-4 w-4 text-orange-400" />
              Categories
            </div>

            {categories.map((category) => {
              const active =
                selectedCategory ===
                category;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() =>
                    handleCategoryChange(
                      category
                    )
                  }
                  className={`shrink-0 rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
                    active
                      ? "border-orange-400/30 bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20"
                      : "border-white/10 bg-white/[0.025] text-slate-400 hover:border-orange-400/20 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        {/* =================================================
            CONTENT
        ================================================= */}

        {loading ? (
          <HomeSkeleton />
        ) : filteredBlogs.length === 0 ? (
          /* ===============================================
             EMPTY STATE
          =============================================== */

          <section className="rounded-[2rem] border border-dashed border-white/10 bg-white/[0.025] px-6 py-20 text-center backdrop-blur-xl sm:px-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-400/20 bg-orange-400/[0.07]">
              <Search className="h-7 w-7 text-orange-400" />
            </div>

            <h2 className="mt-6 text-xl font-black text-white">
              No articles found
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
              We couldn't find any articles
              matching your current search or
              category. Try changing your filters.
            </p>

            <button
              type="button"
              onClick={resetFilters}
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.02] hover:shadow-orange-500/30"
            >
              <Sparkles className="h-4 w-4" />
              Reset filters
            </button>
          </section>
        ) : (
          <>
            {/* =============================================
                HERO + TRENDING
            ============================================= */}

            {heroBlog && (
              <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* =========================================
                    HERO ARTICLE
                ========================================= */}

                <article className="group relative min-h-[470px] overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-2xl shadow-black/30 lg:col-span-8">
                  {/* Image */}
                  <div className="absolute inset-0">
                    {heroBlog.coverImage ? (
                      <img
                        src={heroBlog.coverImage}
                        alt={
                          heroBlog.title ||
                          "Featured article"
                        }
                        className="h-full w-full object-cover transition duration-[1200ms] group-hover:scale-105"
                      />
                    ) : (
                      <ImagePlaceholder large />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-[#050611] via-[#08091a]/75 to-transparent" />

                    <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />
                  </div>

                  {/* Category */}
                  <div className="absolute left-5 top-5 z-20">
                    <span className="inline-flex items-center gap-2 rounded-full border border-orange-300/20 bg-black/55 px-3.5 py-2 text-[9px] font-black uppercase tracking-[0.17em] text-orange-300 backdrop-blur-xl">
                      <Flame className="h-3 w-3" />
                      {heroBlog.category ||
                        "Featured"}
                    </span>
                  </div>

                  {/* Featured label */}
                  <div className="absolute right-5 top-5 z-20 hidden rounded-full border border-white/10 bg-black/40 px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-300 backdrop-blur-xl sm:block">
                    Featured story
                  </div>

                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 z-10 p-6 sm:p-8 lg:p-10">
                    <div className="flex flex-wrap items-center gap-3 text-[10px] font-medium text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-orange-400" />
                        {formatDate(
                          heroBlog.createdAt
                        )}
                      </span>

                      <span className="h-1 w-1 rounded-full bg-slate-500" />

                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-amber-400" />
                        {getCommentCount(
                          heroBlog
                        )}{" "}
                        comments
                      </span>
                    </div>

                    <h2 className="mt-4 max-w-3xl text-2xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
                      <Link
                        to={`/blogs/${heroBlog.slug}`}
                        className="transition-colors hover:text-orange-200"
                      >
                        {heroBlog.title}
                      </Link>
                    </h2>

                    <p className="mt-4 max-w-2xl line-clamp-2 text-sm leading-6 text-slate-300">
                      {heroBlog.excerpt ||
                        "Explore this thoughtfully written article and discover practical insights, ideas and useful information."}
                    </p>

                    <div className="mt-6 flex flex-wrap items-center gap-4">
                      <Link
                        to={`/blogs/${heroBlog.slug}`}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-3 text-xs font-black text-white shadow-lg shadow-orange-600/25 transition-all hover:-translate-y-0.5 hover:shadow-orange-500/40"
                      >
                        Read full story
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>

                      {/* Hero Pagination */}
                      <div className="flex items-center rounded-xl border border-white/10 bg-black/40 p-1 backdrop-blur-xl">
                        <button
                          type="button"
                          disabled={
                            !pagination.hasPreviousPage
                          }
                          onClick={() =>
                            handlePageChange(
                              currentPage - 1
                            )
                          }
                          aria-label="Previous page"
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>

                        <span className="px-3 text-[10px] font-bold text-slate-300">
                          {pagination.currentPage}{" "}
                          /{" "}
                          {pagination.totalPages}
                        </span>

                        <button
                          type="button"
                          disabled={
                            !pagination.hasNextPage
                          }
                          onClick={() =>
                            handlePageChange(
                              currentPage + 1
                            )
                          }
                          aria-label="Next page"
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>

                {/* =========================================
                    TRENDING
                ========================================= */}

                <aside className="flex flex-col lg:col-span-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
                        <Flame className="h-4 w-4 text-orange-400" />
                      </div>

                      <div>
                        <h3 className="text-xs font-black uppercase tracking-[0.15em] text-white">
                          Trending
                        </h3>

                        <p className="mt-0.5 text-[9px] text-slate-600">
                          Popular stories
                        </p>
                      </div>
                    </div>

                    <TrendingUp className="h-4 w-4 text-slate-600" />
                  </div>

                  <div className="flex flex-1 flex-col gap-3">
                    {sidebarBlogs.length > 0 ? (
                      sidebarBlogs.map(
                        (blog, index) => (
                          <TrendingCard
                            key={
                              blog._id ||
                              blog.slug
                            }
                            blog={blog}
                            index={index}
                          />
                        )
                      )
                    ) : (
                      <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-xs text-slate-600">
                        More stories coming
                        soon.
                      </div>
                    )}
                  </div>
                </aside>
              </section>
            )}

            {/* =============================================
                LATEST ARTICLES
            ============================================= */}

            {gridBlogs.length > 0 && (
              <section className="mt-14">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-8 rounded-full bg-gradient-to-r from-orange-500 to-amber-400" />

                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-400">
                        Fresh content
                      </span>
                    </div>

                    <h3 className="mt-2 text-xl font-black text-white sm:text-2xl">
                      Latest Journal Entries
                    </h3>
                  </div>

                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                    {gridBlogs.length} articles
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {gridBlogs.map((blog) => (
                    <ArticleCard
                      key={
                        blog._id ||
                        blog.slug
                      }
                      blog={blog}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* =================================================
            BOTTOM PAGINATION
        ================================================= */}

        {!loading &&
          pagination.totalPages > 1 && (
            <div className="mt-14 flex flex-wrap items-center justify-center gap-2 border-t border-white/10 pt-8">
              {/* Previous */}
              <button
                type="button"
                disabled={
                  !pagination.hasPreviousPage
                }
                onClick={() =>
                  handlePageChange(
                    currentPage - 1
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-400 transition hover:border-orange-400/20 hover:bg-orange-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">
                  Previous
                </span>
              </button>

              {/* Numbers */}
              <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.025] p-1">
                {pageNumbers.map(
                  (page, index) => {
                    if (page === "...") {
                      return (
                        <span
                          key={`dots-${index}`}
                          className="flex h-9 w-7 items-center justify-center text-xs text-slate-600"
                        >
                          ...
                        </span>
                      );
                    }

                    return (
                      <button
                        key={page}
                        type="button"
                        onClick={() =>
                          handlePageChange(
                            page
                          )
                        }
                        className={`h-9 w-9 rounded-lg text-[10px] font-black transition-all ${
                          currentPage ===
                          page
                            ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20"
                            : "text-slate-500 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  }
                )}
              </div>

              {/* Next */}
              <button
                type="button"
                disabled={
                  !pagination.hasNextPage
                }
                onClick={() =>
                  handlePageChange(
                    currentPage + 1
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-400 transition hover:border-orange-400/20 hover:bg-orange-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
              >
                <span className="hidden sm:inline">
                  Next
                </span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
      </main>
    </div>
  );
}
