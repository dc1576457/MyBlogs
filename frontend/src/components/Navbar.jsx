import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  User,
  LogOut,
  LayoutDashboard,
  ChevronDown,
  BookOpen,
  Wrench,
  ShieldCheck,
  Network,
  History as HistoryIcon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setOpen(false);
      navigate("/", { replace: true });
    }
  };

  const getInitial =
    user?.name?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    "U";

  const isAdmin =
    String(user?.role || "")
      .trim()
      .toLowerCase() === "admin";

  const navLinkClasses = ({ isActive }) =>
    `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
      isActive
        ? "bg-orange-500/15 text-orange-400 border border-orange-500/30"
        : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
    }`;

  return (
    <nav className="sticky top-0 z-[100] w-full border-b border-white/10 bg-[#070816]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:px-6">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 transition hover:opacity-90 active:scale-95"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 text-sm font-black text-white shadow-md shadow-orange-500/20">
            B
          </div>
          <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-base font-extrabold tracking-tight text-transparent">
            MyBlog
          </span>
        </Link>

        {/* Center Nav Links */}
        <div className="flex items-center gap-1">
          <NavLink to="/" end className={navLinkClasses}>
            <Wrench size={14} className="shrink-0" />
            <span>Tools</span>
          </NavLink>

          <NavLink to="/blogs" className={navLinkClasses}>
            <BookOpen size={14} className="shrink-0" />
            <span>Blogs</span>
          </NavLink>

          <NavLink to="/postman" end className={navLinkClasses}>
            <Network size={14} className="shrink-0" />
            <span>API</span>
          </NavLink>
        </div>

        {/* User Auth Section */}
        <div ref={dropdownRef} className="relative shrink-0">
          {loading ? (
            <div className="h-8 w-16 animate-pulse rounded-lg bg-white/5" />
          ) : user ? (
            <button
              type="button"
              onClick={() => setOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-1 pr-2.5 transition hover:border-orange-500/30 hover:bg-white/[0.06]"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-tr from-amber-500 to-orange-500 text-[10px] font-bold text-white">
                {getInitial}
              </div>
              <span className="hidden max-w-[100px] truncate text-xs font-semibold text-slate-200 sm:block">
                {user.name || user.email}
              </span>
              <ChevronDown
                size={13}
                className={`text-slate-400 transition-transform duration-200 ${
                  open ? "rotate-180 text-orange-400" : ""
                }`}
              />
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link
                to="/login"
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-orange-500/20 transition hover:opacity-95"
              >
                Signup
              </Link>
            </div>
          )}

          {/* Dropdown Menu */}
          {user && open && (
            <div className="absolute right-0 mt-2 w-60 rounded-xl border border-white/10 bg-[#0d0f22] p-1.5 shadow-2xl backdrop-blur-xl z-[130] animate-in fade-in slide-in-from-top-2">
              <div className="mb-1 rounded-lg bg-white/[0.03] p-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-orange-500 font-bold text-xs text-white">
                    {getInitial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-white">
                      {user.name || "User"}
                    </p>
                    <p className="truncate text-[10px] text-slate-400">
                      {user.email}
                    </p>
                  </div>
                  {isAdmin && (
                    <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-[9px] font-bold text-orange-400">
                      ADMIN
                    </span>
                  )}
                </div>
              </div>

              <Link
                to="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-300 hover:bg-white/[0.06] hover:text-white"
              >
                <User size={14} className="text-slate-400" />
                Profile
              </Link>

              {isAdmin && (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-300 hover:bg-white/[0.06] hover:text-white"
                  >
                    <LayoutDashboard size={14} className="text-slate-400" />
                    Dashboard
                  </Link>

                  <Link
                    to="/history"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-300 hover:bg-white/[0.06] hover:text-white"
                  >
                    <HistoryIcon size={14} className="text-slate-400" />
                    Conversion History
                  </Link>
                </>
              )}

              <div className="my-1 border-t border-white/5" />

              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-rose-400 hover:bg-rose-500/10"
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
