import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Lock,
  UserPlus,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signup } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const redirectTo = location.state?.from || "/blogs";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!form.email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const result = await signup(
        form.name,
        form.email,
        form.password
      );

      /*
      If backend returns token,
      signup immediately logs user in.
      */
      if (result.authenticated) {
        navigate(redirectTo, { replace: true });
        return;
      }

      /*
      Otherwise go to login.
      */
      navigate("/login", {
        replace: true,
        state: {
          from: redirectTo,
          signupSuccess: true,
        },
      });
    } catch (error) {
      console.error("SIGNUP ERROR:", error);
      setError(
        error.response?.data?.message ||
          error.message ||
          "Unable to create account."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] w-full items-center justify-center bg-slate-950 px-4 py-4 text-white">
      <div className="w-full max-w-md my-auto">
        
        {/* Main Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          
          {/* Header Badge */}
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 ring-1 ring-orange-500/20">
              <UserPlus className="text-orange-400" size={24} />
            </div>
          </div>

          {/* Header Title */}
          <div className="mb-3 text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-2xl">
              Create Account
            </h1>
            <p className="mt-1.3 text-xs text-slate-400 sm:text-sm">
              Create an account to read full articles.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 sm:text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* NAME */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Name
              </label>
              <div className="relative">
                <User
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Your name"
                  autoComplete="name"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 outline-none transition-all duration-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                  required
                />
              </div>
            </div>

            {/* EMAIL */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Email
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 outline-none transition-all duration-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                  required
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Minimum 6 characters"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-11 text-sm text-white placeholder:text-slate-600 outline-none transition-all duration-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* CONFIRM PASSWORD */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Confirm Password
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-11 text-sm text-white placeholder:text-slate-600 outline-none transition-all duration-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all duration-200 hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>

          {/* FOOTER */}
          <div className="mt-3 border-t border-slate-800 pt-3 text-center">
            <p className="text-xs text-slate-400 sm:text-sm">
              Already have an account?{" "}
              <Link
                to="/login"
                state={{ from: redirectTo }}
                className="font-bold text-orange-400 hover:text-orange-300 hover:underline"
              >
                Login
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}