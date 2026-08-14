import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  User,
  Mail,
  Shield,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  BookOpen,
  Sparkles,
  Check,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user } = useAuth();

  // Active Tab: 'overview' | 'security'
  const [activeTab, setActiveTab] = useState("overview");

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Password Visibility Toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form Status States
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  if (!user) {
    return null;
  }

  // Password Validation Checklist
  const passwordChecks = [
    { label: "At least 6 characters", valid: newPassword.length >= 6 },
    {
      label: "Passwords match",
      valid: newPassword.length > 0 && newPassword === confirmPassword,
    },
  ];

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!currentPassword) {
      setFormError("Please enter your current password.");
      return;
    }

    if (newPassword.length < 6) {
      setFormError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError("New password and confirm password do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setFormError("New password cannot be the same as your current password.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.put("/auth/change-password", {
        currentPassword,
        newPassword,
      });

      if (response.data?.success) {
        setFormSuccess("Password updated successfully!");
        toast.success("Password changed successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        throw new Error(response.data?.message || "Failed to update password.");
      }
    } catch (err) {
      console.error("Change Password Error:", err);
      const message =
        err.response?.data?.message ||
        err.message ||
        "Failed to change password. Please check your current password.";
      setFormError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-950 font-sans text-slate-100 selection:bg-indigo-500 selection:text-white antialiased overflow-x-hidden py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Ambient Glow Lights */}
      <div className="pointer-events-none absolute -top-40 left-1/3 h-[500px] w-[500px] rounded-full bg-indigo-600/15 blur-[140px]" />
      <div className="pointer-events-none absolute top-1/2 -right-20 h-[450px] w-[450px] rounded-full bg-purple-600/15 blur-[140px]" />
      <div className="pointer-events-none absolute bottom-10 left-1/4 h-[400px] w-[400px] rounded-full bg-amber-500/10 blur-[130px]" />

      <Toaster
        position="top-right"
        toastOptions={{
          className:
            "text-xs font-semibold border border-white/10 bg-slate-900/90 text-white shadow-2xl backdrop-blur-xl rounded-xl p-3.5",
        }}
      />

      <div className="relative mx-auto max-w-4xl space-y-8">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            to="/blogs"
            className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 backdrop-blur-md transition-all duration-300 hover:border-indigo-500/40 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft
              size={15}
              className="transition-transform group-hover:-translate-x-1 text-indigo-400"
            />
            Back to Blogs
          </Link>

          <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-300">
            Account Center
          </span>
        </div>

        {/* User Hero Banner Card */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-indigo-950/40 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              {/* Large Avatar */}
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-fuchsia-600 text-3xl font-extrabold text-white shadow-xl shadow-indigo-500/25 ring-4 ring-white/10">
                {user.name?.charAt(0)?.toUpperCase() || "U"}
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 ring-2 ring-slate-950" />
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {user.name}
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                    <ShieldCheck size={12} className="text-indigo-400" />
                    {user.role || "user"}
                  </span>
                </div>
                <p className="mt-1 text-xs sm:text-sm font-medium text-slate-400">
                  {user.email}
                </p>
              </div>
            </div>

            <Link
              to="/blogs"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <BookOpen size={15} />
              Explore Articles
            </Link>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-8 flex items-center gap-2 border-t border-white/10 pt-6">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "overview"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "border border-white/10 bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              <User size={14} />
              Profile Details
            </button>

            <button
              onClick={() => setActiveTab("security")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "security"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "border border-white/10 bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              <KeyRound size={14} />
              Security & Password
            </button>
          </div>
        </div>

        {/* TAB 1: PROFILE OVERVIEW */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-[fadeIn_0.2s_ease-out]">
            {/* Name Card */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl transition hover:border-indigo-500/30">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Full Name
                </p>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                  <User size={16} />
                </div>
              </div>
              <h3 className="mt-3 text-base font-bold text-white">
                {user.name}
              </h3>
              <p className="mt-1 text-[11px] text-slate-500">
                Primary display identity
              </p>
            </div>

            {/* Email Card */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl transition hover:border-purple-500/30">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Email Address
                </p>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                  <Mail size={16} />
                </div>
              </div>
              <h3 className="mt-3 text-base font-bold text-white truncate">
                {user.email}
              </h3>
              <p className="mt-1 text-[11px] text-slate-500">
                Verified login email
              </p>
            </div>

            {/* Role Card */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl transition hover:border-emerald-500/30">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Access Level
                </p>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Shield size={16} />
                </div>
              </div>
              <h3 className="mt-3 text-base font-bold capitalize text-emerald-400">
                {user.role || "user"}
              </h3>
              <p className="mt-1 text-[11px] text-slate-500">
                Authorized permissions
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: CHANGE PASSWORD */}
        {activeTab === "security" && (
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl animate-[fadeIn_0.2s_ease-out]">
            <div className="flex items-center gap-3 border-b border-white/10 pb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Lock size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  Update Account Password
                </h2>
                <p className="text-xs text-slate-400">
                  Ensure your account is using a strong, unique password.
                </p>
              </div>
            </div>

            {/* Alerts */}
            {formError && (
              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-950/40 p-3.5 text-xs text-rose-300 backdrop-blur-md">
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-3.5 text-xs text-emerald-300 backdrop-blur-md">
                <CheckCircle2
                  size={16}
                  className="mt-0.5 shrink-0 text-emerald-400"
                />
                <span>{formSuccess}</span>
              </div>
            )}

            {/* Password Form */}
            <form onSubmit={handlePasswordChange} className="mt-6 space-y-5">
              {/* Current Password */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Current Password
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 py-3 pl-10 pr-11 text-xs text-white placeholder:text-slate-600 outline-none transition hover:border-white/20 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  New Password
                </label>
                <div className="relative">
                  <KeyRound
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min. 6 chars)"
                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 py-3 pl-10 pr-11 text-xs text-white placeholder:text-slate-600 outline-none transition hover:border-white/20 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Confirm New Password
                </label>
                <div className="relative">
                  <KeyRound
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 py-3 pl-10 pr-11 text-xs text-white placeholder:text-slate-600 outline-none transition hover:border-white/20 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Password Checklist Feedback */}
              {newPassword && (
                <div className="flex flex-wrap gap-3 pt-1 text-[11px]">
                  {passwordChecks.map((check, idx) => (
                    <div
                      key={idx}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 ${
                        check.valid
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-white/5 text-slate-400 border border-white/10"
                      }`}
                    >
                      <Check
                        size={12}
                        className={
                          check.valid ? "text-emerald-400" : "text-slate-600"
                        }
                      />
                      <span>{check.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound size={16} />
                      <span>Save New Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}