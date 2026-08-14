import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn, Loader2, Lock, Mail, AlertCircle, ShieldAlert } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);

  const redirectTo = location.state?.from || "/blogs";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsBlocked(false);

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    try {
      setLoading(true);
      const res = await login(email, password);

      // Check if returned user object is blocked
      if (res?.user?.isBlocked || res?.isBlocked) {
        setIsBlocked(true);
        setError("Your account has been suspended. Please contact support.");
        return;
      }

      navigate(redirectTo, { replace: true });
    } catch (err) {
      console.error("LOGIN ERROR:", err);

      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Login failed. Please check your credentials.";

      const isBlockedError =
        err.response?.status === 403 ||
        err.response?.data?.code === "ACCOUNT_BLOCKED" ||
        err.response?.data?.isBlocked ||
        errorMessage.toLowerCase().includes("block") ||
        errorMessage.toLowerCase().includes("suspend");

      if (isBlockedError) {
        setIsBlocked(true);
        setError("Your account has been suspended. Please contact support.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-slate-950 text-white px-4 mt-5">
      {/* Ambient Gradient Background Glows */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-orange-500/20 via-amber-500/10 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-gradient-to-tl from-orange-600/15 via-rose-500/10 to-transparent blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Dark Glass Card Container */}
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-8 shadow-2xl shadow-black/80 backdrop-blur-2xl sm:p-10">
          
          {/* Gradient Icon Badge */}
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20 ring-4 ring-orange-500/10">
            {isBlocked ? (
              <ShieldAlert size={26} strokeWidth={2.2} className="text-white" />
            ) : (
              <Lock size={24} strokeWidth={2.2} />
            )}
          </div>

          {/* Heading */}
          <div className="mb-8 text-center">
            <h1 className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
              {isBlocked ? "Account Suspended" : "Welcome Back"}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {isBlocked
                ? "Your account access has been restricted by an administrator."
                : "Sign in to unlock full stories and seamless reading."}
            </p>
          </div>

          {/* Error Message Alert */}
          {error && (
            <div className={`mb-4 flex items-start gap-3 rounded-2xl border p-3.5 text-sm shadow-sm backdrop-blur-md ${
              isBlocked
                ? "border-rose-500/40 bg-rose-950/60 text-rose-300"
                : "border-red-500/30 bg-red-950/40 text-red-300"
            }`}>
              <AlertCircle size={18} className={`mt-0.5 shrink-0 ${isBlocked ? "text-rose-400" : "text-red-400"}`} />
              <span className="leading-snug font-medium">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition-all duration-200 hover:border-slate-700 focus:border-orange-500 focus:bg-slate-950 focus:ring-4 focus:ring-orange-500/20"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-orange-400 transition hover:text-orange-300 hover:underline"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-3 pl-10 pr-11 text-sm text-white placeholder:text-slate-500 outline-none transition-all duration-200 hover:border-slate-700 focus:border-orange-500 focus:bg-slate-950 focus:ring-4 focus:ring-orange-500/20"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-200 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Gradient Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all duration-300 hover:opacity-95 hover:shadow-xl hover:shadow-orange-500/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin text-white" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn size={18} className="transition-transform group-hover:translate-x-0.5" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className="mt-4 border-t border-slate-800/80 pt-2 text-center text-sm text-slate-400">
            <span>Don't have an account? </span>
            <Link
              to="/signup"
              state={{ from: redirectTo }}
              className="font-bold text-orange-400 transition hover:text-orange-300 hover:underline"
            >
              Create Account
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}