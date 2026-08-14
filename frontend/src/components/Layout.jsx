import React from "react";
import { Outlet } from "react-router-dom";

import Navbar from "./Navbar";

export default function Layout() {
  return (
    <div className="min-h-screen bg-white text-slate-900">

      <Navbar />

      <main>
        <Outlet />
      </main>

    </div>
  );
}