import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
  NavLink,
  useNavigate,
} from "react-router-dom";

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

  const {
    user,
    loading,
    logout,
  } = useAuth();

  const [open, setOpen] = useState(false);

  const dropdownRef = useRef(null);

  // =========================================================
  // CLOSE DROPDOWN WHEN CLICKING OUTSIDE
  // =========================================================

  useEffect(() => {
    const handleClick = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);

    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, []);

  // =========================================================
  // LOGOUT
  // =========================================================

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

  // =========================================================
  // USER INITIAL
  // =========================================================

  const getInitial =
    user?.name?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    "U";

  // =========================================================
  // ADMIN CHECK
  // =========================================================

  const isAdmin =
    String(user?.role || "")
      .trim()
      .toLowerCase() === "admin";

  return (
    <nav
      className="
        sticky
        top-0
        z-[100]
        w-full
        h-16
        border-b
        border-slate-200/80
        bg-white/95
        backdrop-blur-xl
        supports-[backdrop-filter]:bg-white/80
        shadow-sm
      "
    >
      <div
        className="
          mx-auto
          flex
          h-16
          max-w-7xl
          items-center
          justify-between
          px-3
          sm:px-6
        "
      >
        {/* ===================================================
            LOGO
        ==================================================== */}

        <Link
          to="/"
          className="
            group
            flex
            shrink-0
            items-center
            gap-2
            sm:gap-2.5
            transition-transform
            hover:scale-[1.02]
            active:scale-[0.98]
          "
        >
          <div
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-gradient-to-tr
              from-amber-500
              via-orange-500
              to-rose-500
              font-black
              text-white
              shadow-md
              shadow-orange-500/25
            "
          >
            B
          </div>

          <span
            className="
              bg-gradient-to-r
              from-slate-900
              via-slate-800
              to-slate-900
              bg-clip-text
              text-lg
              font-extrabold
              tracking-tight
              text-transparent
              sm:text-xl
            "
          >
            MyBlog
          </span>
        </Link>

        {/* ===================================================
            DESKTOP / TABLET NAVIGATION
        ==================================================== */}

        <div className="hidden items-center gap-1 md:flex">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `
                flex
                items-center
                gap-2
                rounded-xl
                px-3
                py-2
                text-sm
                font-semibold
                transition-all
                lg:px-4

                ${
                  isActive
                    ? "bg-orange-50/80 text-orange-600 shadow-sm"
                    : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                }
              `
            }
          >
            <Wrench size={16} className="shrink-0" />
            Tools
          </NavLink>

          <NavLink
            to="/blogs"
            className={({ isActive }) =>
              `
                flex
                items-center
                gap-2
                rounded-xl
                px-3
                py-2
                text-sm
                font-semibold
                transition-all
                lg:px-4

                ${
                  isActive
                    ? "bg-orange-50/80 text-orange-600 shadow-sm"
                    : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                }
              `
            }
          >
            <BookOpen size={16} className="shrink-0" />
            Blogs
          </NavLink>

          <NavLink
            to="/postman"
            end
            className={({ isActive }) =>
              `
                flex
                items-center
                gap-2
                rounded-xl
                px-3
                py-2
                text-sm
                font-semibold
                transition-all
                lg:px-4

                ${
                  isActive
                    ? "bg-orange-50/80 text-orange-600 shadow-sm"
                    : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                }
              `
            }
          >
            <Network size={16} className="shrink-0" />
            <span className="hidden lg:inline">API TESTING</span>
            <span className="lg:hidden">API</span>
          </NavLink>
        </div>

        {/* ===================================================
            RIGHT SIDE USER MENU
        ==================================================== */}

        <div ref={dropdownRef} className="relative shrink-0">
          {loading ? (
            <div className="h-10 w-20 animate-pulse rounded-full bg-slate-200/80 sm:w-28" />
          ) : user ? (
            /* Logged-In User Button */
            <button
              type="button"
              onClick={() => setOpen((previous) => !previous)}
              className="
                group
                flex
                items-center
                gap-2
                rounded-full
                border
                border-slate-200/80
                bg-slate-50/50
                p-1.5
                pr-2.5
                shadow-sm
                transition-all
                hover:border-orange-300
                hover:bg-white
                hover:shadow-md
                sm:gap-2.5
                sm:pr-3.5
              "
            >
              <div
                className="
                  flex
                  h-8
                  w-8
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  bg-gradient-to-tr
                  from-amber-500
                  via-orange-500
                  to-rose-500
                  text-xs
                  font-bold
                  text-white
                  shadow-sm
                "
              >
                {getInitial}
              </div>

              <span
                className="
                  hidden
                  max-w-32
                  truncate
                  text-xs
                  font-bold
                  text-slate-800
                  sm:block
                "
              >
                {user.name || user.email}
              </span>

              <ChevronDown
                size={15}
                className={`
                  text-slate-400
                  transition-transform
                  duration-200
                  group-hover:text-slate-600

                  ${open ? "rotate-180 text-orange-600" : ""}
                `}
              />
            </button>
          ) : (
            /* Guest Buttons */
            <div className="flex items-center gap-1 sm:gap-2">
              <Link
                to="/login"
                className="
                  rounded-xl
                  px-2.5
                  py-2
                  text-xs
                  font-bold
                  text-slate-700
                  transition
                  hover:bg-slate-100/80
                  hover:text-slate-900
                  sm:px-4
                "
              >
                Login
              </Link>

              <Link
                to="/signup"
                className="
                  rounded-xl
                  bg-gradient-to-r
                  from-slate-900
                  via-slate-800
                  to-slate-900
                  px-2.5
                  py-2
                  text-xs
                  font-bold
                  text-white
                  shadow-md
                  shadow-slate-900/10
                  transition
                  hover:scale-[1.02]
                  hover:shadow-slate-900/20
                  active:scale-[0.98]
                  sm:px-4
                "
              >
                Signup
              </Link>
            </div>
          )}

          {/* =================================================
              DROPDOWN MENU
          ================================================== */}

          {user && open && (
            <div
              className="
                absolute
                right-0
                mt-2.5
                w-[calc(100vw-1.5rem)]
                max-w-72
                overflow-hidden
                rounded-2xl
                border
                border-slate-200/80
                bg-white/95
                p-1.5
                shadow-xl
                shadow-slate-300/40
                backdrop-blur-xl
                z-[110]
                animate-in
                fade-in
                slide-in-from-top-2
                duration-200
              "
            >
              {/* User Header */}
              <div className="mb-1 rounded-xl bg-slate-50/80 p-3">
                <div className="flex items-center gap-3">
                  <div
                    className="
                      flex
                      h-10
                      w-10
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      bg-gradient-to-tr
                      from-amber-500
                      via-orange-500
                      to-rose-500
                      font-bold
                      text-sm
                      text-white
                      shadow-sm
                    "
                  >
                    {getInitial}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-bold text-xs text-slate-900">
                        {user.name || "User"}
                      </p>

                      {isAdmin && (
                        <span
                          className="
                            inline-flex
                            shrink-0
                            items-center
                            gap-0.5
                            rounded-full
                            bg-orange-100
                            px-1.5
                            py-0.5
                            text-[10px]
                            font-bold
                            text-orange-700
                          "
                        >
                          <ShieldCheck size={11} />
                          ADMIN
                        </span>
                      )}
                    </div>

                    <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Profile Link */}
              <Link
                to="/profile"
                onClick={() => setOpen(false)}
                className="
                  flex
                  items-center
                  gap-2.5
                  rounded-xl
                  px-3
                  py-2.5
                  text-xs
                  font-semibold
                  text-slate-700
                  transition
                  hover:bg-orange-50/70
                  hover:text-orange-600
                "
              >
                <User size={16} className="text-slate-400" />
                Profile
              </Link>

              {/* Blogs Link */}
              <Link
                to="/blogs"
                onClick={() => setOpen(false)}
                className="
                  flex
                  items-center
                  gap-2.5
                  rounded-xl
                  px-3
                  py-2.5
                  text-xs
                  font-semibold
                  text-slate-700
                  transition
                  hover:bg-orange-50/70
                  hover:text-orange-600
                "
              >
                <BookOpen size={16} className="text-slate-400" />
                Blogs
              </Link>

              {/* Dashboard Link (Admin Only) */}
              {isAdmin && (
                <Link
                  to="/dashboard"
                  onClick={() => setOpen(false)}
                  className="
                    flex
                    items-center
                    gap-2.5
                    rounded-xl
                    px-3
                    py-2.5
                    text-xs
                    font-semibold
                    text-slate-700
                    transition
                    hover:bg-orange-50/70
                    hover:text-orange-600
                  "
                >
                  <LayoutDashboard size={16} className="text-slate-400" />
                  Dashboard
                </Link>
              )}

              {/* History Logs Link (Admin Only) */}
              {isAdmin && (
                <Link
                  to="/history"
                  onClick={() => setOpen(false)}
                  className="
                    flex
                    items-center
                    gap-2.5
                    rounded-xl
                    px-3
                    py-2.5
                    text-xs
                    font-semibold
                    text-slate-700
                    transition
                    hover:bg-orange-50/70
                    hover:text-orange-600
                  "
                >
                  <HistoryIcon size={16} className="text-slate-400" />
                  Conversion History
                </Link>
              )}

              <div className="my-1 border-t border-slate-100" />

              {/* Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                className="
                  flex
                  w-full
                  items-center
                  gap-2.5
                  rounded-xl
                  px-3
                  py-2.5
                  text-left
                  text-xs
                  font-semibold
                  text-rose-600
                  transition
                  hover:bg-rose-50
                  hover:text-rose-700
                "
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
