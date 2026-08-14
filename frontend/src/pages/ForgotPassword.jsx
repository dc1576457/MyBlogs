import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, Loader2, KeyRound, CheckCircle2, AlertCircle, Send } from "lucide-react";
import axios from "axios";

const AUTH_API_URL = "https://myblogs-fr9t.onrender.com/api/auth";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your registered email address.");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${AUTH_API_URL}/forgot-password`, { email });

      if (response.data?.success) {
        setIsSubmitted(true);
      }
    } catch (err) {
      console.error("Forgot Password Error:", err);
      setError(
        err.response?.data?.message ||
        err.message ||
        "Failed to send reset link. Please check your email address."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-slate-950 text-white px-4">
      {/* Ambient Gradient Background Glows */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-orange-500/20 via-amber-500/10 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-gradient-to-tl from-purple-600/15 via-indigo-500/10 to-transparent blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-8 shadow-2xl shadow-black/80 backdrop-blur-2xl sm:p-10">
          
          {/* Top Badge Icon */}
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20 ring-4 ring-orange-500/10">
            {isSubmitted ? <CheckCircle2 size={26} strokeWidth={2.2} /> : <KeyRound size={24} strokeWidth={2.2} />}
          </div>

          {/* Heading */}
          <div className="mb-6 text-center">
            <h1 className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-2xl sm:text-3xl font-extrabold tracking-tight text-transparent">
              {isSubmitted ? "Check Your Email" : "Forgot Password?"}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-400">
              {isSubmitted
                ? `We have sent password recovery instructions to ${email}.`
                : "Enter your email address and we'll send you a link to reset your password."}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-950/40 p-3.5 text-xs sm:text-sm text-rose-300 backdrop-blur-md">
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 outline-none transition duration-200 hover:border-slate-700 focus:border-orange-500 focus:bg-slate-950 focus:ring-4 focus:ring-orange-500/20"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all duration-300 hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Send Reset Link</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => {
                  setIsSubmitted(false);
                  setEmail("");
                }}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-semibold text-slate-300 hover:bg-white/10 transition"
              >
                Send to another email
              </button>
            </div>
          )}

          {/* Back to Login Link */}
          <div className="mt-6 border-t border-slate-800/80 pt-4 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-400 transition hover:text-orange-300 hover:underline"
            >
              <ArrowLeft size={14} />
              Back to Login
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
