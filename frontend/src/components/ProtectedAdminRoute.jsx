import React from "react";
import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export default function ProtectedAdminRoute() {
  const {
    user,
    loading,
  } = useAuth();

  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
  <div className="relative flex flex-col items-center justify-center">
    
    {/* Ambient Glow */}
    <div className="absolute h-32 w-32 rounded-full bg-orange-500/10 blur-3xl" />

    {/* Spinner */}
    <div className="relative flex h-16 w-16 items-center justify-center">
      <div className="absolute inset-0 rounded-full border-4 border-slate-800" />

      <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-orange-500 border-r-amber-400" />

      <div className="h-8 w-8 rounded-full bg-slate-900 shadow-inner shadow-orange-500/10" />
    </div>

    {/* Text */}
    <div className="mt-6 text-center">
      <h3 className="text-sm font-semibold tracking-wide text-slate-200">
        Checking Admin Access
      </h3>

      <p className="mt-1.5 text-xs text-slate-500">
        Please wait while we verify your permissions...
      </p>
    </div>

    {/* Loading Dots */}
    <div className="mt-4 flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-500 [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-400 [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-400" />
    </div>
  </div>
</div>
    );
  }

  // Login required
  if (!user) {
    return (
      <Navigate
        to="/404"
        replace
        state={{
          from:
            location.pathname +
            location.search,
        }}
      />
    );
  }

  // Admin required
  if (user.role !== "admin") {
    return (
      <Navigate
        to="/404"
        replace
      />
    );
  }

  return <Outlet />;
}
