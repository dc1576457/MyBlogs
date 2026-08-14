import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, KeyRound } from "lucide-react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";

const AUTH_API_URL = "https://myblogs-fr9t.onrender.com/api/auth";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.put(`${AUTH_API_URL}/reset-password/${token}`, {
        password,
      });

      if (response.data?.success) {
        setIsSuccess(true);
        toast.success("Password reset successful!");
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      }
    } catch (err) {
      console.error("Reset Password Error:", err);
      setError(
        err.response?.data?.message ||
        err.message ||
        "Invalid or expired reset token. Please request a new link."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-slate-950 text-white px-4">
      <Toaster position="top-right" />

      {/* Ambient Glow Background */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-orange-500/20 via-amber-500/10 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-gradient-to-tl from-purple-600/15 via-indigo-500/10 to-transparent blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-8 shadow-2xl shadow-black/80 backdrop-blur-2xl sm:p-10">
          
          {/* Badge Icon */}
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20 ring-4 ring-orange-500/10">
            {isSuccess ? <CheckCircle2 size={26} /> : <Lock size={24} />}
          </div>

          <div className="mb-6 text-center">
            <h1 className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-2xl sm:text-3xl font-extrabold tracking-tight text-transparent">
              {isSuccess ? "Password Reset Done!" : "Set New Password"}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-400">
              {isSuccess
                ? "Your password has been changed. Redirecting to login..."
                : "Please enter your new password below."}
            </p>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-950/40 p-3.5 text-xs sm:text-sm text-rose-300 backdrop-blur-md">
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {!isSuccess ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  New Password
                </label>
                <div className="relative">
                  <KeyRound size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-3 pl-10 pr-11 text-sm text-white placeholder:text-slate-600 outline-none transition hover:border-slate-700 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Confirm Password
                </label>
                <div className="relative">
                  <KeyRound size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-3 pl-10 pr-11 text-sm text-white placeholder:text-slate-600 outline-none transition hover:border-slate-700 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all duration-300 hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <span>Reset Password</span>
                )}
              </button>
            </form>
          ) : (
            <Link
              to="/login"
              className="mt-4 flex w-full justify-center rounded-xl bg-orange-500 py-3 text-xs font-bold text-white shadow-lg hover:bg-orange-600 transition"
            >
              Go to Login
            </Link>
          )}

        </div>
      </div>
    </div>
  );
}
