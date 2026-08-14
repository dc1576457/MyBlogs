import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Home,
  BookOpen,
  Wrench,
  Network,
  Compass,
  Sparkles,
} from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-slate-950 font-sans text-slate-100 selection:bg-amber-500 selection:text-slate-950 antialiased overflow-x-hidden flex items-center justify-center p-4 sm:p-6">
      {/* Background Ambient Glow Lights */}
      <div className="pointer-events-none absolute -top-24 left-1/3 h-80 w-80 rounded-full bg-indigo-600/15 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-10 right-1/4 h-72 w-72 rounded-full bg-amber-500/10 blur-[120px]" />

      <div className="relative z-10 w-full max-w-lg text-center">
        {/* Main Medium Glass Card */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Subtle Top Highlight */}
          <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-28 w-60 rounded-full bg-amber-500/15 blur-2xl" />

          {/* Floating Icon Badge */}
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#ff6f00] via-amber-500 to-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 ring-4 ring-amber-500/10">
            <Compass className="h-6 w-6 animate-[spin_10s_linear_infinite]" />
          </div>

          {/* 404 Header Number */}
          <h1 className="bg-gradient-to-b from-white via-slate-100 to-slate-500 bg-clip-text text-6xl sm:text-7xl font-black tracking-tight text-transparent select-none leading-none">
            404
          </h1>

          {/* Title & Description */}
          <div className="mt-3 space-y-1.5">
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Page Not Found
            </h2>
            <p className="mx-auto max-w-sm text-xs text-slate-400 leading-relaxed">
              The page you're looking for doesn't exist, has been moved, or the link is broken.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
            <button
              onClick={() => navigate(-1)}
              className="group inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-semibold text-slate-300 backdrop-blur-md transition hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-[0.98]"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1 text-slate-400 group-hover:text-white" />
              <span>Go Back</span>
            </button>

            <Link
              to="/"
              className="group relative inline-flex w-full sm:w-auto items-center justify-center gap-1.5 overflow-hidden rounded-xl bg-gradient-to-r from-[#ff6f00] via-amber-500 to-amber-400 px-6 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition hover:scale-[1.02] active:scale-[0.98]"
            >
              <Home className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Back to Home</span>
            </Link>
          </div>

          {/* Compact Quick Destinations */}
          <div className="mt-6 border-t border-white/10 pt-5">
            <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">
              <Sparkles className="h-3 w-3 text-amber-400" />
              <span>Quick Destinations</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-left">
              {/* Tools */}
              <Link
                to="/"
                className="group flex flex-col items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] p-2.5 text-center transition hover:border-amber-500/30 hover:bg-white/[0.05]"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 mb-1.5 group-hover:scale-110 transition-transform">
                  <Wrench className="h-3.5 w-3.5" />
                </div>
                <span className="text-[11px] font-bold text-slate-300 group-hover:text-amber-400 truncate w-full">
                  Tools
                </span>
              </Link>

              {/* Blogs */}
              <Link
                to="/blogs"
                className="group flex flex-col items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] p-2.5 text-center transition hover:border-indigo-500/30 hover:bg-white/[0.05]"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 mb-1.5 group-hover:scale-110 transition-transform">
                  <BookOpen className="h-3.5 w-3.5" />
                </div>
                <span className="text-[11px] font-bold text-slate-300 group-hover:text-indigo-400 truncate w-full">
                  Blogs
                </span>
              </Link>

              {/* API Studio */}
              <Link
                to="/postman"
                className="group flex flex-col items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] p-2.5 text-center transition hover:border-purple-500/30 hover:bg-white/[0.05]"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 mb-1.5 group-hover:scale-110 transition-transform">
                  <Network className="h-3.5 w-3.5" />
                </div>
                <span className="text-[11px] font-bold text-slate-300 group-hover:text-purple-400 truncate w-full">
                  API Studio
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}