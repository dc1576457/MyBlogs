import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";

import {
  Plus,
  FileText,
  Eye,
  CheckCircle2,
  Clock,
  Edit3,
  Trash2,
  Loader2,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  Image as ImageIcon,
  Sparkles,
  Layers,
  ArrowUpRight,
  AlertTriangle,
  Share2,
  User,
  Users,
  LogOut,
  Shield,
  Mail,
  Calendar,
  Ban,
  Unlock,
} from "lucide-react";

const API_BASE_URL = "https://myblogs-fr9t.onrender.com/api/blogs";
const AUTH_API_URL = "https://myblogs-fr9t.onrender.com/api/auth";

export default function Dashboard() {
  const navigate = useNavigate();

  // DASHBOARD VIEW TAB: 'blogs' | 'users'
  const [activeMainTab, setActiveMainTab] = useState("blogs");

  // AUTH / LOGGED-IN USER STATE
  const [currentUser, setCurrentUser] = useState(null);

  // USERS MANAGEMENT STATE
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [deletingUserId, setDeletingUserId] = useState(null);

  // USER DELETE MODAL STATE
  const [deleteUserModal, setDeleteUserModal] = useState({
    open: false,
    userId: null,
    name: "",
  });

  // BLOGS STATE
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);

  // DELETE BLOG CONFIRMATION MODAL STATE
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    blogId: null,
    title: "",
  });

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalBlogs: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  // =========================================================
  // HELPER: GET AUTH CONFIG WITH BEARER TOKEN
  // =========================================================

  const getAuthConfig = () => {
    const token = localStorage.getItem("token");

    return {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      withCredentials: true,
    };
  };

  // =========================================================
  // FETCH LOGGED-IN USER PROFILE (/api/auth/me)
  // =========================================================

  const fetchMe = async () => {
    try {
      const response = await axios.get(`${AUTH_API_URL}/me`, getAuthConfig());

      if (response.data?.success || response.data?.user) {
        setCurrentUser(response.data.user || response.data.data || response.data);
      }
    } catch (error) {
      console.error("Fetch Me Error:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      }
    }
  };

  // =========================================================
  // FETCH ALL USERS (/api/auth/users)
  // =========================================================

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const response = await axios.get(`${AUTH_API_URL}/users`, getAuthConfig());

      if (response.data?.success || Array.isArray(response.data?.users)) {
        setUsers(response.data.users || response.data.data || []);
      }
    } catch (error) {
      console.error("Fetch Users Error:", error);
      toast.error(
        error.response?.data?.message || "Failed to load registered users."
      );
    } finally {
      setUsersLoading(false);
    }
  };

  // =========================================================
  // BLOCK / UNBLOCK USER ACTION (ADMINS CANNOT BE BLOCKED)
  // =========================================================

  const handleToggleBlockUser = async (user) => {
    if (!user) return;

    if (user.role?.toLowerCase() === "admin") {
      toast.error("Admin users cannot be blocked!");
      return;
    }

    const userId = user?._id || user?.id || user?.userId;

    if (!userId) {
      toast.error("User ID not found.");
      return;
    }

    const currentBlockedStatus = Boolean(user.isBlocked);
    const actionText = currentBlockedStatus ? "unblocking" : "blocking";

    const toastId = toast.loading(`Processing ${actionText}...`);

    try {
      const response = await axios.patch(
        `${AUTH_API_URL}/users/${userId}/block`,
        {},
        getAuthConfig()
      );

      if (response.data?.success === false) {
        throw new Error(
          response.data?.message || "Failed to update user status."
        );
      }

      const updatedStatus =
        typeof response.data?.isBlocked === "boolean"
          ? response.data.isBlocked
          : typeof response.data?.user?.isBlocked === "boolean"
          ? response.data.user.isBlocked
          : !currentBlockedStatus;

      setUsers((prevUsers) =>
        prevUsers.map((u) => {
          const existingUserId = u._id || u.id || u.userId;
          if (String(existingUserId) === String(userId)) {
            return {
              ...u,
              isBlocked: updatedStatus,
            };
          }
          return u;
        })
      );

      toast.success(
        response.data?.message ||
          `User ${updatedStatus ? "blocked" : "unblocked"} successfully!`,
        { id: toastId }
      );
    } catch (error) {
      console.error("Toggle Block Error:", error);
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to change block status.";
      toast.error(message, { id: toastId });
    }
  };

  // =========================================================
  // OPEN DELETE USER MODAL
  // =========================================================

  const handleDeleteUserClick = (user) => {
    if (user.role?.toLowerCase() === "admin") {
      toast.error("Admin users cannot be deleted!");
      return;
    }

    const userId = user?._id || user?.id || user?.userId;
    setDeleteUserModal({
      open: true,
      userId,
      name: user.name || user.username || user.email || "this user",
    });
  };

  // =========================================================
  // CONFIRM DELETE USER
  // =========================================================

  const confirmDeleteUser = async () => {
    const userId = deleteUserModal.userId;
    if (!userId) return;

    setDeletingUserId(userId);
    const toastId = toast.loading("Deleting user account...");

    try {
      const response = await axios.delete(
        `${AUTH_API_URL}/users/${userId}`,
        getAuthConfig()
      );

      if (response.data?.success === false) {
        throw new Error(response.data?.message || "Failed to delete user.");
      }

      setUsers((prev) =>
        prev.filter((u) => (u._id || u.id || u.userId) !== userId)
      );

      toast.success("User account deleted successfully!", { id: toastId });

      setDeleteUserModal({
        open: false,
        userId: null,
        name: "",
      });
    } catch (error) {
      console.error("Delete User Error:", error);
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to delete user.",
        { id: toastId }
      );
    } finally {
      setDeletingUserId(null);
    }
  };

  // =========================================================
  // LOGOUT USER
  // =========================================================

  const handleLogout = async () => {
    const toastId = toast.loading("Logging out...");
    try {
      await axios.post(`${AUTH_API_URL}/logout`, {}, getAuthConfig());
    } catch (error) {
      console.error("Logout Error:", error);
    } finally {
      localStorage.removeItem("token");
      setCurrentUser(null);
      toast.success("Logged out successfully!", { id: toastId });
      navigate("/login");
    }
  };

  // =========================================================
  // FETCH BLOGS
  // =========================================================

  const fetchBlogs = async (page = currentPage) => {
    setLoading(true);

    try {
      const response = await axios.get(
        `${API_BASE_URL}?page=${page}`,
        getAuthConfig()
      );

      if (response.data?.success || Array.isArray(response.data?.blogs)) {
        setBlogs(response.data.blogs || []);

        setPagination(
          response.data.pagination || {
            currentPage: page,
            totalPages: response.data.totalPages || 1,
            totalBlogs: response.data.totalBlogs || response.data.blogs?.length || 0,
            hasNextPage: response.data.hasNextPage || false,
            hasPreviousPage: response.data.hasPreviousPage || false,
          }
        );
      }
    } catch (error) {
      console.error("Dashboard Data Fetch Error:", error);

      toast.error(
        error.response?.data?.message || "Failed to load blog posts."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // INITIAL LOAD & EFFECTS
  // =========================================================

  useEffect(() => {
    fetchMe();
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchBlogs(currentPage);
  }, [currentPage]);

  // =========================================================
  // SHARE POST LINK
  // =========================================================

  const handleSharePost = async (blog) => {
    try {
      if (!blog) {
        toast.error("Post not found.");
        return;
      }

      if (blog.status !== "published") {
        toast.error("Only published posts can be shared.");
        return;
      }

      if (!blog.slug) {
        toast.error("Post slug not found.");
        return;
      }

      const postUrl = `${window.location.origin}/post/${blog.slug}`;

      if (navigator.share) {
        await navigator.share({
          title: blog.title || "Blog Post",
          text: blog.excerpt || "Read this blog post",
          url: postUrl,
        });
        return;
      }

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(postUrl);
        toast.success("Post link copied successfully!");
        return;
      }

      const textarea = document.createElement("textarea");
      textarea.value = postUrl;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);

      toast.success("Post link copied successfully!");
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.error("Share Post Error:", error);
      toast.error("Unable to share post link.");
    }
  };

  // =========================================================
  // OPEN DELETE BLOG CONFIRMATION MODAL
  // =========================================================

  const handleDeleteClick = (blog) => {
    setDeleteModal({
      open: true,
      blogId: blog._id || blog.id,
      title: blog.title || "Untitled Article",
    });
  };

  // =========================================================
  // CONFIRM DELETE BLOG
  // =========================================================

  const confirmDelete = async () => {
    const id = deleteModal.blogId;
    if (!id) return;

    setDeletingId(id);
    const toastId = toast.loading("Deleting post...");

    try {
      await axios.delete(`${API_BASE_URL}/${id}`, getAuthConfig());

      setBlogs((prev) => prev.filter((blog) => (blog._id || blog.id) !== id));

      toast.success("Post deleted successfully!", { id: toastId });

      setDeleteModal({
        open: false,
        blogId: null,
        title: "",
      });

      fetchBlogs(currentPage);
    } catch (error) {
      console.error("Delete Error:", error);
      toast.error(
        error.response?.data?.message ||
          "Failed to delete post. Please check admin permissions.",
        { id: toastId }
      );
    } finally {
      setDeletingId(null);
    }
  };

  // =========================================================
  // HANDLE EDIT NAVIGATION
  // =========================================================

  const handleEditClick = (blog) => {
    const id = blog._id || blog.id;
    if (!id) {
      toast.error("Invalid Blog ID");
      return;
    }
    navigate(`/edit/${id}`, { state: { blog } });
  };

  // =========================================================
  // FILTER + SEARCH BLOGS
  // =========================================================

  const filteredBlogs = blogs.filter((blog) => {
    const matchesStatus =
      filterStatus === "all" ? true : blog?.status === filterStatus;

    const matchesSearch =
      blog?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      blog?.category?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  // =========================================================
  // FILTER USERS
  // =========================================================

  const filteredUsers = users.filter((u) => {
    const name = u?.name || u?.username || "";
    const email = u?.email || "";
    return (
      name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      email.toLowerCase().includes(userSearchQuery.toLowerCase())
    );
  });

  // =========================================================
  // METRICS
  // =========================================================

  const totalPosts = pagination.totalBlogs || blogs.length;
  const publishedCount = blogs.filter((blog) => blog?.status === "published").length;
  const draftCount = blogs.filter((blog) => blog?.status === "draft").length;
  const totalViews = blogs.reduce((acc, curr) => acc + (curr?.views || 0), 0);

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="relative min-h-screen bg-slate-950 font-sans text-slate-100 selection:bg-amber-500 selection:text-slate-950 antialiased overflow-x-hidden">

      {/* Background Ambient Glow Lights */}
      <div className="pointer-events-none absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-indigo-600/15 blur-[140px]" />
      <div className="pointer-events-none absolute top-1/3 -right-20 h-[450px] w-[450px] rounded-full bg-purple-600/15 blur-[140px]" />
      <div className="pointer-events-none absolute bottom-10 left-1/3 h-[400px] w-[400px] rounded-full bg-amber-500/10 blur-[130px]" />

      <Toaster
        position="top-right"
        toastOptions={{
          className:
            "text-xs font-semibold border border-white/10 bg-slate-900/90 text-white shadow-2xl backdrop-blur-xl rounded-xl p-3.5",
        }}
      />

      {/* =====================================================
          TOP NAVIGATION
      ====================================================== */}

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-slate-950/80 px-4 sm:px-8 shadow-2xl backdrop-blur-xl">

        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#ff6f00] via-amber-500 to-amber-400 text-xl font-black text-slate-950 shadow-lg shadow-amber-500/20">
            B
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold leading-none text-white tracking-tight">
                Admin Dashboard
              </h1>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                PRO
              </span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-400">
              Manage your blog content, users and performance analytics
            </p>
          </div>
        </div>

        {/* TOP RIGHT USER MANAGEMENT & ACTIONS */}
        <div className="flex items-center gap-3">
          {currentUser && (
            <div className="hidden sm:flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 font-bold uppercase">
                {currentUser.name ? currentUser.name[0] : <User className="h-4 w-4" />}
              </div>
              <div className="text-left leading-tight">
                <p className="font-semibold text-white">
                  {currentUser.name || currentUser.username || "Admin"}
                </p>
                <p className="text-[10px] text-slate-400">
                  {currentUser.email || "Administrator"}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={() => navigate("/new-post")}
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#ff6f00] via-amber-500 to-amber-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4 stroke-[3] transition-transform duration-300 group-hover:rotate-90" />
            <span>Create Post</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all active:scale-95"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

      </header>

      {/* =====================================================
          MAIN CONTENT
      ====================================================== */}

      <main className="relative z-10 mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-8">

        {/* VIEW NAVIGATION TABS (ARTICLES vs USERS) */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <button
            onClick={() => setActiveMainTab("blogs")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeMainTab === "blogs"
                ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                : "border border-white/10 bg-white/5 text-slate-400 hover:text-white"
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Articles Management</span>
            <span className="rounded-full bg-slate-950/30 px-2 py-0.5 text-[10px]">
              {totalPosts}
            </span>
          </button>

          <button
            onClick={() => setActiveMainTab("users")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeMainTab === "users"
                ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                : "border border-white/10 bg-white/5 text-slate-400 hover:text-white"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Users Management</span>
            <span className="rounded-full bg-slate-950/30 px-2 py-0.5 text-[10px]">
              {users.length}
            </span>
          </button>
        </div>

        {/* =====================================================
            METRIC CARDS
        ====================================================== */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {/* TOTAL ARTICLES */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/50 to-indigo-950/40 p-5 shadow-xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/40">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Total Articles
                </p>
                <h3 className="mt-2 text-3xl font-black tracking-tight text-white">
                  {totalPosts}
                </h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10 text-blue-400">
                <FileText className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-400">
              <Layers className="h-3.5 w-3.5 text-blue-400" />
              <span>All recorded content entries</span>
            </div>
          </div>

          {/* TOTAL USERS */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/50 to-cyan-950/40 p-5 shadow-xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/40">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Total Users
                </p>
                <h3 className="mt-2 text-3xl font-black tracking-tight text-cyan-400">
                  {users.length}
                </h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
                <Users className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-[11px] text-cyan-400/80">
              <Shield className="h-3.5 w-3.5 text-cyan-400" />
              <span>Registered accounts</span>
            </div>
          </div>

          {/* DRAFTS */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/50 to-amber-950/30 p-5 shadow-xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/40">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Drafts
                </p>
                <h3 className="mt-2 text-3xl font-black tracking-tight text-amber-400">
                  {draftCount}
                </h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
                <Clock className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-[11px] text-amber-400/80">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              <span>Pending publication</span>
            </div>
          </div>

          {/* VIEWS */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/50 to-purple-950/40 p-5 shadow-xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-purple-500/40">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Total Views
                </p>
                <h3 className="mt-2 text-3xl font-black tracking-tight text-purple-300">
                  {totalViews.toLocaleString()}
                </h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-500/30 bg-purple-500/10 text-purple-300">
                <Eye className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-[11px] text-purple-300/80">
              <ArrowUpRight className="h-3.5 w-3.5 text-purple-400" />
              <span>Cumulative reader engagements</span>
            </div>
          </div>

        </div>

        {/* =====================================================
            MAIN CONTENT TAB 1: ARTICLES MANAGEMENT
        ====================================================== */}

        {activeMainTab === "blogs" && (
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 shadow-2xl backdrop-blur-2xl">

            {/* TOOLBAR */}
            <div className="flex flex-col justify-between gap-4 border-b border-white/10 bg-slate-950/40 p-5 sm:flex-row sm:items-center">

              <div className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-black/40 p-1.5 text-xs font-semibold text-slate-300 shadow-inner">
                {[
                  { id: "all", label: "All Posts", count: blogs.length },
                  { id: "published", label: "Published", count: publishedCount },
                  { id: "draft", label: "Drafts", count: draftCount },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterStatus(tab.id)}
                    className={`rounded-xl px-4 py-2 transition-all duration-200 ${
                      filterStatus === tab.id
                        ? "bg-gradient-to-r from-amber-500 to-[#ff6f00] text-slate-950 font-bold shadow-md"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {tab.label}
                    <span className="ml-1 text-[11px]">({tab.count})</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1 sm:w-72">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search title or category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2.5 pl-10 pr-9 text-xs text-white outline-none focus:border-amber-500/50"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-3 text-slate-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => fetchBlogs(currentPage)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:text-white active:scale-95"
                  title="Refresh Table"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${
                      loading ? "animate-spin text-amber-500" : ""
                    }`}
                  />
                </button>
              </div>

            </div>

            {/* TABLE */}
            {loading ? (
              <div className="flex flex-col items-center justify-center space-y-4 py-28 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                <p className="text-xs font-semibold text-slate-300">
                  Loading articles...
                </p>
              </div>
            ) : filteredBlogs.length === 0 ? (
              <div className="space-y-3 py-24 text-center">
                <Search className="mx-auto h-8 w-8 text-slate-500" />
                <p className="text-base font-bold text-white">
                  No matching articles found
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-slate-950/40 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-6 py-4">Article</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/5 text-slate-200">
                    {filteredBlogs.map((blog) => (
                      <tr
                        key={blog._id || blog.id}
                        className="group hover:bg-white/[0.03]"
                      >
                        {/* ARTICLE */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3.5">
                            {blog.coverImage ? (
                              <img
                                src={blog.coverImage}
                                alt={blog.title}
                                className="h-11 w-11 shrink-0 rounded-xl border border-white/10 object-cover"
                              />
                            ) : (
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400">
                                <ImageIcon className="h-5 w-5" />
                              </div>
                            )}

                            <div className="min-w-0 max-w-xs sm:max-w-md">
                              <h4 className="truncate font-bold text-slate-100 group-hover:text-amber-400">
                                {blog.title || "Untitled Article"}
                              </h4>
                              <p className="mt-1 truncate font-mono text-[11px] text-slate-500">
                                /{blog.slug || blog._id}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* CATEGORY */}
                        <td className="px-6 py-4">
                          <span className="inline-block rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[11px] font-semibold text-indigo-300">
                            {blog.category || "General"}
                          </span>
                        </td>

                        {/* STATUS */}
                        <td className="px-6 py-4">
                          {blog.status === "published" ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-400">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                              Published
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-400">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                              Draft
                            </span>
                          )}
                        </td>

                        {/* DATE */}
                        <td className="px-6 py-4 text-[11px] font-medium text-slate-400">
                          {new Date(
                            blog.createdAt || Date.now()
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>

                        {/* ACTIONS */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {blog.status === "published" && blog.slug && (
                              <button
                                onClick={() => handleSharePost(blog)}
                                className="rounded-xl border border-white/5 bg-white/5 p-2 text-slate-400 transition-all hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-400 active:scale-95"
                                title="Share Post"
                              >
                                <Share2 className="h-4 w-4" />
                              </button>
                            )}

                            <button
                              onClick={() => handleEditClick(blog)}
                              className="rounded-xl border border-white/5 bg-white/5 p-2 text-slate-400 hover:border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-400"
                              title="Edit Article"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteClick(blog)}
                              className="rounded-xl border border-white/5 bg-white/5 p-2 text-slate-400 hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400"
                              title="Delete Article"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* PAGINATION */}
            <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 bg-slate-950/40 p-5 sm:flex-row">
              <p className="text-xs font-semibold text-slate-400">
                Showing page{" "}
                <span className="font-bold text-white">
                  {pagination.currentPage}
                </span>{" "}
                of{" "}
                <span className="font-bold text-white">
                  {pagination.totalPages || 1}
                </span>
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={!pagination.hasPreviousPage || loading}
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </button>

                <button
                  disabled={!pagination.hasNextPage || loading}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 disabled:opacity-30"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

          </div>
        )}

        {/* =====================================================
            MAIN CONTENT TAB 2: USERS MANAGEMENT
        ====================================================== */}

        {activeMainTab === "users" && (
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 shadow-2xl backdrop-blur-2xl">

            {/* USER TOOLBAR */}
            <div className="flex flex-col justify-between gap-4 border-b border-white/10 bg-slate-950/40 p-5 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  Registered Users Directory
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1 sm:w-72">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search user by name or email..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2.5 pl-10 pr-9 text-xs text-white outline-none focus:border-amber-500/50"
                  />
                  {userSearchQuery && (
                    <button
                      onClick={() => setUserSearchQuery("")}
                      className="absolute right-3 top-3 text-slate-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <button
                  onClick={fetchUsers}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:text-white active:scale-95"
                  title="Refresh Users"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${
                      usersLoading ? "animate-spin text-amber-500" : ""
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* USERS TABLE */}
            {usersLoading ? (
              <div className="flex flex-col items-center justify-center space-y-4 py-28 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                <p className="text-xs font-semibold text-slate-300">
                  Loading users...
                </p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="space-y-3 py-24 text-center">
                <Users className="mx-auto h-8 w-8 text-slate-500" />
                <p className="text-base font-bold text-white">
                  No registered users found
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-slate-950/40 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Joined Date</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/5 text-slate-200">
                    {filteredUsers.map((u, idx) => (
                      <tr
                        key={u._id || u.id || idx}
                        className="group hover:bg-white/[0.03]"
                      >
                        {/* USER INFO */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 font-bold uppercase">
                              {(u.name || u.username || "U")[0]}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-100 group-hover:text-amber-400">
                                {u.name || u.username || "Anonymous User"}
                              </h4>
                              <p className="text-[10px] text-slate-500 font-mono">
                                ID: {u._id || u.id || "N/A"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* EMAIL */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Mail className="h-3.5 w-3.5 text-slate-500" />
                            <span>{u.email || "No email provided"}</span>
                          </div>
                        </td>

                        {/* ROLE */}
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 capitalize">
                            <Shield className="h-3 w-3" />
                            {u.role || "user"}
                          </span>
                        </td>

                        {/* JOINED DATE */}
                        <td className="px-6 py-4 text-[11px] font-medium text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-500" />
                            {new Date(
                              u.createdAt || Date.now()
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                        </td>

                        {/* STATUS (ACTIVE / BLOCKED) */}
                        <td className="px-6 py-4">
                          {u.isBlocked ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-[11px] font-semibold text-rose-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                              Blocked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Active
                            </span>
                          )}
                        </td>

                        {/* ACTIONS (BLOCK / UNBLOCK + DELETE) */}
                        <td className="px-6 py-4 text-right">
                          {u.role === "admin" ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-xl border border-white/5 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 cursor-not-allowed"
                              title="Admin users cannot be modified"
                            >
                              <Shield className="h-3.5 w-3.5 text-amber-500/70" />
                              Protected
                            </span>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Block / Unblock Button */}
                              <button
                                onClick={() => handleToggleBlockUser(u)}
                                className={`rounded-xl border p-2 text-xs font-semibold transition-all active:scale-95 ${
                                  u.isBlocked
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                                    : "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                                }`}
                                title={u.isBlocked ? "Unblock User" : "Block User"}
                              >
                                {u.isBlocked ? (
                                  <Unlock className="h-4 w-4" />
                                ) : (
                                  <Ban className="h-4 w-4" />
                                )}
                              </button>

                              {/* Delete User Button */}
                              <button
                                onClick={() => handleDeleteUserClick(u)}
                                className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2 text-rose-400 hover:bg-rose-500/20 transition-all active:scale-95"
                                title="Delete User"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* USER FOOTER METRIC */}
            <div className="flex items-center justify-between border-t border-white/10 bg-slate-950/40 p-5">
              <p className="text-xs font-semibold text-slate-400">
                Total Loaded Users:{" "}
                <span className="font-bold text-white">{filteredUsers.length}</span>
              </p>
            </div>

          </div>
        )}

      </main>

      {/* =====================================================
          DELETE BLOG CONFIRMATION MODAL
      ====================================================== */}

      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-rose-500/30 bg-slate-900/95 p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400">
                <AlertTriangle className="h-6 w-6" />
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <h3 className="text-lg font-extrabold text-white">
                  Delete Blog Post?
                </h3>
                <p className="mt-1 text-xs text-slate-300">
                  Are you sure you want to delete{" "}
                  <span className="font-bold text-amber-400">
                    "{deleteModal.title}"
                  </span>
                  ? This action is permanent.
                </p>
              </div>

              <button
                onClick={() =>
                  setDeleteModal({ open: false, blogId: null, title: "" })
                }
                className="rounded-xl p-1.5 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/10 pt-4">
              <button
                onClick={() =>
                  setDeleteModal({ open: false, blogId: null, title: "" })
                }
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>

              <button
                onClick={confirmDelete}
                disabled={!!deletingId}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-5 py-2 text-xs font-bold text-white shadow-lg"
              >
                {deletingId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          DELETE USER CONFIRMATION MODAL
      ====================================================== */}

      {deleteUserModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-rose-500/30 bg-slate-900/95 p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400">
                <AlertTriangle className="h-6 w-6" />
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <h3 className="text-lg font-extrabold text-white">
                  Delete User Account?
                </h3>
                <p className="mt-1 text-xs text-slate-300">
                  Are you sure you want to permanently delete{" "}
                  <span className="font-bold text-amber-400">
                    "{deleteUserModal.name}"
                  </span>
                  ? This action cannot be undone.
                </p>
              </div>

              <button
                onClick={() =>
                  setDeleteUserModal({ open: false, userId: null, name: "" })
                }
                className="rounded-xl p-1.5 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/10 pt-4">
              <button
                onClick={() =>
                  setDeleteUserModal({ open: false, userId: null, name: "" })
                }
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>

              <button
                onClick={confirmDeleteUser}
                disabled={!!deletingUserId}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-5 py-2 text-xs font-bold text-white shadow-lg"
              >
                {deletingUserId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Yes, Delete User
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
