import React from "react";
import { Routes, Route } from "react-router-dom";

import ErrorBoundary from "./components/ErrorBoundary"; // <-- Added

import Layout from "./components/Layout";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import PostEditor from "./pages/PostEditor";
import PostDetails from "./pages/PostDetails";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Tools from "./pages/tools/Tools";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import History from "./postman/History";
import PostmanStudio from "./postman/PostmanStudio";

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<Layout />}>
          {/* PUBLIC ROUTES */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/" element={<Tools />} />
          <Route path="/blogs" element={<Home />} />

          {/* PUBLIC BLOG ARTICLE */}
          <Route path="/blogs/:slug" element={<PostDetails />} />
          <Route path="/post/:slug" element={<PostDetails />} />

          {/* AUTH ROUTES */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* LOGGED-IN USER ROUTES */}
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<Profile />} />
            <Route path="/postman" element={<PostmanStudio />} />
          </Route>

          {/* ADMIN ONLY ROUTES */}
          <Route element={<ProtectedAdminRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/history" element={<History />} />
            <Route path="/new-post" element={<PostEditor />} />
            <Route path="/edit/:id" element={<PostEditor />} />
          </Route>

          {/* 404 NOT FOUND */}
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}