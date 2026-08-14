import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  History as HistoryIcon,
  Search,
  RefreshCw,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Code,
  User as UserIcon,
  Globe,
  X,
  AlertTriangle,
  Loader2,
  Calendar,
  ArrowLeft,
  FileQuestion,
  Filter,
  Shield,
  Layers,
  Clock,
  UserCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const API_BASE_URL = "https://myblogs-fr9t.onrender.com/api/convert/admin/history";

export default function History() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [historyList, setHistoryList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("ALL");
  const [selectedUserFilter, setSelectedUserFilter] = useState("ALL");
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);

  // Detail Modal State
  const [viewItem, setViewItem] = useState(null);

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    id: null,
    title: "",
  });
  const [deletingId, setDeletingId] = useState(null);

  const getAuthConfig = () => {
    const token = localStorage.getItem("token");
    return {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      withCredentials: true,
    };
  };

  const fetchHistory = async (page = currentPage) => {
    if (!user || user.role?.toLowerCase() !== "admin") return;

    setLoading(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}?page=${page}&limit=10&search=${encodeURIComponent(
          searchQuery
        )}&method=${selectedMethod}&userId=${selectedUserFilter}`,
        getAuthConfig()
      );

      if (response.data?.success) {
        setHistoryList(response.data.history || []);
        setUsersList(response.data.usersList || []);
        setTotalPages(response.data.totalPages || 1);
        setTotalEntries(response.data.totalEntries || 0);
      }
    } catch (error) {
      console.error("Fetch History Error:", error);
      toast.error(
        error.response?.data?.message || "Failed to load conversion history."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user && user.role?.toLowerCase() === "admin") {
      fetchHistory(currentPage);
    }
  }, [currentPage, selectedMethod, selectedUserFilter, authLoading, user]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchHistory(1);
  };

  const handleCopyCurl = (curl) => {
    if (!curl) {
      toast.error("No cURL command available.");
      return;
    }
    navigator.clipboard.writeText(curl);
    toast.success("cURL command copied to clipboard!");
  };

  const confirmDelete = async () => {
    const id = deleteModal.id;
    if (!id) return;

    setDeletingId(id);
    const toastId = toast.loading("Deleting history entry...");

    try {
      const response = await axios.delete(
        `${API_BASE_URL}/${id}`,
        getAuthConfig()
      );

      if (response.data?.success) {
        setHistoryList((prev) => prev.filter((item) => item._id !== id));
        toast.success("Entry deleted successfully!", { id: toastId });
        setDeleteModal({ open: false, id: null, title: "" });
        fetchHistory(currentPage);
      }
    } catch (error) {
      console.error("Delete Error:", error);
      toast.error(
        error.response?.data?.message || "Failed to delete history item.",
        { id: toastId }
      );
    } finally {
      setDeletingId(null);
    }
  };

  const getMethodBadgeClass = (method) => {
    switch (method?.toUpperCase()) {
      case "GET":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "POST":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "PUT":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "PATCH":
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "DELETE":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
    }
  };

  // =========================================================
  // 1. AUTH LOADING
  // =========================================================
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500 mb-3" />
        <p className="text-xs font-semibold">Loading dashboard logs...</p>
      </div>
    );
  }

  // =========================================================
  // 2. NON-ADMIN / GUEST STRICT 404
  // =========================================================
  if (!user || user.role?.toLowerCase() !== "admin") {
    return (
      <div className="relative min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-white">
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-[600px] rounded-full bg-indigo-600/10 blur-[140px]" />

        <div className="relative w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-slate-400 shadow-2xl backdrop-blur-xl">
            <FileQuestion size={40} className="text-amber-500" />
          </div>

          <h1 className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-6xl font-black tracking-tight text-transparent">
            404
          </h1>

          <h2 className="mt-3 text-xl font-bold text-white">
            Page Not Found
          </h2>

          <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
            The page you are looking for doesn't exist, has been removed, or the link is invalid.
          </p>

          <div className="mt-8 flex justify-center">
            <Link
              to="/blogs"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-[#ff6f00] px-6 py-3 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:scale-[1.02] active:scale-[0.98]"
            >
              <ArrowLeft size={16} />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // 3. ADMIN HISTORY VIEW WITH USER TRACKING
  // =========================================================
  return (
    <div className="relative min-h-screen bg-slate-950 font-sans text-slate-100 selection:bg-amber-500 selection:text-slate-950 antialiased overflow-x-hidden p-4 sm:p-8">
      <div className="pointer-events-none absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-indigo-600/15 blur-[140px]" />
      <div className="pointer-events-none absolute bottom-10 right-1/4 h-[400px] w-[400px] rounded-full bg-amber-500/10 blur-[130px]" />

      <Toaster position="top-right" />

      <div className="relative mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-500/20">
              <HistoryIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  User Conversion History Management
                </h1>
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                  ADMIN MONITOR
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Track which user generated, saved, and executed API conversions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-slate-300">
              Total Log Entries: <span className="text-amber-400 font-bold">{totalEntries}</span>
            </span>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 shadow-2xl backdrop-blur-2xl">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 border-b border-white/10 bg-slate-950/40 p-5">
            
            {/* Search Input (URL, Title or User Name/Email) */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-80">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search URL, title, or user name/email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2.5 pl-10 pr-9 text-xs text-white outline-none focus:border-amber-500/50"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setCurrentPage(1);
                    fetchHistory(1);
                  }}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </form>

            {/* Filter by User Dropdown */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={selectedUserFilter}
                  onChange={(e) => {
                    setSelectedUserFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-white/10 bg-slate-950/80 py-2 pl-3 pr-8 text-xs text-slate-200 outline-none focus:border-amber-500/50 cursor-pointer"
                >
                  <option value="ALL">All Users (Registered & Guest)</option>
                  <option value="GUEST">Guest / Anonymous Only</option>
                  {usersList.map((u) => (
                    <option key={u._id} value={u._id}>
                      👤 {u.name || u.email} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Method Filters */}
              <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/10 bg-black/40 p-1.5 text-xs font-semibold text-slate-300">
                {["ALL", "GET", "POST", "PUT", "DELETE"].map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setSelectedMethod(m);
                      setCurrentPage(1);
                    }}
                    className={`rounded-xl px-2.5 py-1.5 transition-all duration-200 ${
                      selectedMethod === m
                        ? "bg-amber-500 text-slate-950 font-bold shadow-md"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {m}
                  </button>
                ))}

                <button
                  onClick={() => fetchHistory(currentPage)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:text-white ml-1"
                  title="Refresh Table"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${
                      loading ? "animate-spin text-amber-500" : ""
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Table View */}
          {loading ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-28 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              <p className="text-xs font-semibold text-slate-300">
                Fetching user conversion logs...
              </p>
            </div>
          ) : historyList.length === 0 ? (
            <div className="space-y-3 py-24 text-center">
              <HistoryIcon className="mx-auto h-8 w-8 text-slate-500" />
              <p className="text-base font-bold text-white">
                No matching conversion records found
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-slate-950/40 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-4">Saved By User</th>
                    <th className="px-6 py-4">Method & Request</th>
                    <th className="px-6 py-4">Endpoint URL</th>
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/5 text-slate-200">
                  {historyList.map((item) => (
                    <tr
                      key={item._id}
                      className="group hover:bg-white/[0.03] transition-colors"
                    >
                      {/* USER COLUMN (CLEAR DETAILS) */}
                      <td className="px-6 py-4">
                        {item.userId ? (
                          <div
                            onClick={() => {
                              setSelectedUserFilter(item.userId._id);
                              setCurrentPage(1);
                            }}
                            className="flex items-center gap-3 cursor-pointer group/user"
                            title="Click to filter by this user"
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold uppercase text-xs">
                              {item.userId.name ? item.userId.name[0] : "U"}
                            </div>
                            <div className="min-w-0 max-w-[160px]">
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-white group-hover/user:text-amber-400 truncate">
                                  {item.userId.name || "Anonymous User"}
                                </p>
                                <span className="rounded bg-indigo-500/20 text-indigo-300 text-[9px] font-bold px-1 py-0.2 capitalize">
                                  {item.userId.role || "user"}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                {item.userId.email}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-500">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 border border-white/10">
                              <UserIcon className="h-4 w-4 text-slate-500" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-400 text-[11px]">
                                Guest / Public
                              </p>
                              <p className="text-[10px] text-slate-600">Not logged in</p>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* METHOD & TITLE */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-lg border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${getMethodBadgeClass(
                              item.method
                            )}`}
                          >
                            {item.method || "GET"}
                          </span>
                          <span className="font-bold text-slate-100 group-hover:text-amber-400 truncate max-w-[140px] sm:max-w-[180px]">
                            {item.title || "Untitled Request"}
                          </span>
                        </div>
                      </td>

                      {/* URL */}
                      <td className="px-6 py-4 font-mono text-[11px] text-slate-400">
                        <div className="flex items-center gap-1.5 truncate max-w-xs sm:max-w-md">
                          <Globe className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span className="truncate">{item.url}</span>
                        </div>
                      </td>

                      {/* DATE */}
                      <td className="px-6 py-4 text-[11px] font-medium text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-500" />
                          {new Date(item.createdAt || Date.now()).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </div>
                      </td>

                      {/* ACTIONS */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Copy cURL */}
                          {item.curlOutput && (
                            <button
                              onClick={() => handleCopyCurl(item.curlOutput)}
                              className="rounded-xl border border-white/5 bg-white/5 p-2 text-slate-400 hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-400 transition"
                              title="Copy cURL Command"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          )}

                          {/* View Full Payload & User Modal */}
                          <button
                            onClick={() => setViewItem(item)}
                            className="rounded-xl border border-white/5 bg-white/5 p-2 text-slate-400 hover:border-indigo-500/30 hover:bg-indigo-500/10 hover:text-indigo-400 transition"
                            title="Inspect User & Conversion Details"
                          >
                            <Code className="h-4 w-4" />
                          </button>

                          {/* Delete Item */}
                          <button
                            onClick={() =>
                              setDeleteModal({
                                open: true,
                                id: item._id,
                                title: item.title || item.url,
                              })
                            }
                            className="rounded-xl border border-white/5 bg-white/5 p-2 text-slate-400 hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400 transition"
                            title="Delete History Log"
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

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10 bg-slate-950/40 p-5">
            <p className="text-xs font-semibold text-slate-400">
              Showing page <span className="font-bold text-white">{currentPage}</span> of{" "}
              <span className="font-bold text-white">{totalPages}</span>
            </p>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage <= 1 || loading}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>

              <button
                disabled={currentPage >= totalPages || loading}
                onClick={() => setCurrentPage((prev) => prev + 1)}
                className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 disabled:opacity-30"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          INSPECT MODAL (FULL USER & REQUEST DETAILS)
      ====================================================== */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 px-4 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-3xl border border-white/15 bg-slate-900/95 p-6 shadow-2xl space-y-5">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <span
                  className={`rounded-lg border px-2.5 py-1 text-xs font-black uppercase ${getMethodBadgeClass(
                    viewItem.method
                  )}`}
                >
                  {viewItem.method}
                </span>
                <h3 className="text-sm font-bold text-white truncate max-w-md">
                  {viewItem.title || viewItem.url}
                </h3>
              </div>
              <button
                onClick={() => setViewItem(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* User Details Banner */}
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                Saved By User Profile
              </span>
              {viewItem.userId ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 font-bold uppercase">
                      {viewItem.userId.name ? viewItem.userId.name[0] : "U"}
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">
                        {viewItem.userId.name || "Anonymous"}
                      </p>
                      <p className="text-slate-400">{viewItem.userId.email}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-slate-400">
                    <span className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-indigo-300 capitalize font-sans font-semibold">
                      Role: {viewItem.userId.role || "user"}
                    </span>
                    <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1">
                      ID: {viewItem.userId._id || "N/A"}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Converted anonymously as a Guest user (No account linked).
                </p>
              )}
            </div>

            {/* URL Display */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Target Endpoint URL
              </span>
              <div className="rounded-xl border border-white/10 bg-slate-950 p-3 font-mono text-xs text-indigo-300 break-all">
                {viewItem.url}
              </div>
            </div>

            {/* Generated cURL */}
            {viewItem.curlOutput && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    Generated cURL Command
                  </span>
                  <button
                    onClick={() => handleCopyCurl(viewItem.curlOutput)}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy cURL
                  </button>
                </div>
                <pre className="rounded-xl border border-white/10 bg-slate-950 p-3.5 font-mono text-xs text-emerald-400 overflow-x-auto whitespace-pre-wrap">
                  {viewItem.curlOutput}
                </pre>
              </div>
            )}

            {/* Payload / Raw Body */}
            {viewItem.rawBody && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Request Payload (Body Mode: {viewItem.bodyMode})
                </span>
                <pre className="rounded-xl border border-white/10 bg-slate-950 p-3.5 font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-48">
                  {viewItem.rawBody}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================
          DELETE CONFIRMATION MODAL
      ====================================================== */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-md rounded-3xl border border-rose-500/30 bg-slate-900/95 p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400">
                <AlertTriangle className="h-6 w-6" />
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <h3 className="text-base font-extrabold text-white">
                  Delete History Log?
                </h3>
                <p className="mt-1 text-xs text-slate-300">
                  Are you sure you want to permanently delete this conversion log?
                </p>
              </div>

              <button
                onClick={() => setDeleteModal({ open: false, id: null, title: "" })}
                className="rounded-xl p-1.5 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/10 pt-4">
              <button
                onClick={() => setDeleteModal({ open: false, id: null, title: "" })}
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
    </div>
  );
}
