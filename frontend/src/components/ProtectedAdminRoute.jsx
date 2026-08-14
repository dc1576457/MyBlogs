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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">

          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-black" />

          <p className="mt-4 text-sm text-slate-500">
            Checking admin access...
          </p>

        </div>
      </div>
    );
  }

  // Login required
  if (!user) {
    return (
      <Navigate
        to="/login"
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