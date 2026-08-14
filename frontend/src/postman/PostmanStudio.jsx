import React, { useState, useEffect } from "react";
import {
  Send,
  Code2,
  Copy,
  Check,
  Terminal,
  Trash2,
  Plus,
  AlertCircle,
  Sparkles,
  Loader2,
  Globe,
  CheckCircle2,
  XCircle,
  Clock,
  Database,
  Save,
  History,
  Lock,
  Key,
} from "lucide-react";

const API_BASE_URL = "https://myblogs-fr9t.onrender.com/api/convert";

const METHOD_COLORS = {
  GET: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  POST: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  PUT: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  DELETE: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  PATCH: "bg-purple-500/10 text-purple-400 border-purple-500/30",
};

const SAMPLE_POSTMAN_IMPORT = JSON.stringify(
  {
    name: "Sample API Request",
    request: {
      method: "POST",
      header: [
        { key: "Content-Type", value: "application/json" },
        { key: "Accept", value: "application/json" },
      ],
      body: {
        mode: "raw",
        raw: JSON.stringify({ name: "Alex Developer", role: "Fullstack Lead" }, null, 2),
      },
      url: {
        raw: "https://jsonplaceholder.typicode.com/posts",
      },
    },
  },
  null,
  2
);

export default function PostmanStudio() {
  // Request States
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("https://jsonplaceholder.typicode.com/posts/1");
  const [params, setParams] = useState([{ id: "1", key: "", value: "", enabled: true }]);
  const [headers, setHeaders] = useState([
    { id: "1", key: "Content-Type", value: "application/json", enabled: true },
  ]);
  const [authType, setAuthType] = useState("none"); // "none" | "bearer"
  const [authToken, setAuthToken] = useState("");
  const [bodyMode, setBodyMode] = useState("none"); // "none" | "json"
  const [rawBody, setRawBody] = useState("");
  const [postmanImportJson, setPostmanImportJson] = useState("");

  // Response & System States
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeReqTab, setActiveReqTab] = useState("params"); // "params" | "headers" | "auth" | "body" | "import" | "curl"
  const [curlCommand, setCurlCommand] = useState("");
  const [copied, setCopied] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync Params with URL
  useEffect(() => {
    try {
      const activeParams = params.filter((p) => p.enabled && p.key.trim());
      const baseUrl = url.split("?")[0];
      if (activeParams.length > 0) {
        const queryStr = activeParams
          .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
          .join("&");
        setUrl(`${baseUrl}?${queryStr}`);
      }
    } catch (e) {}
  }, [params]);

  // Generate Live cURL Command
  useEffect(() => {
    if (!url.trim()) {
      setCurlCommand("");
      return;
    }

    const parts = [`curl --location${method !== "GET" ? ` --request ${method}` : ""}`];
    parts.push(`'${url}'`);

    headers.forEach((h) => {
      if (h.enabled && h.key.trim()) {
        parts.push(`--header '${h.key}: ${h.value}'`);
      }
    });

    if (authType === "bearer" && authToken.trim()) {
      parts.push(`--header 'Authorization: Bearer ${authToken}'`);
    }

    if (method !== "GET" && bodyMode === "json" && rawBody.trim()) {
      const escaped = rawBody.replace(/'/g, "'\\''");
      parts.push(`--data-raw '${escaped}'`);
    }

    setCurlCommand(parts.join(" \\\n  "));
  }, [method, url, headers, authType, authToken, bodyMode, rawBody]);

  // Fetch History from DB on Load
  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/history`);
      const data = await res.json();
      if (data.success) {
        setHistoryList(data.data);
      }
    } catch (e) {
      console.error("History Load Error:", e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Params Row Handlers
  const addParamRow = () => {
    setParams([...params, { id: Date.now().toString(), key: "", value: "", enabled: true }]);
  };
  const updateParamRow = (id, field, val) => {
    setParams(params.map((p) => (p.id === id ? { ...p, [field]: val } : p)));
  };
  const deleteParamRow = (id) => {
    setParams(params.filter((p) => p.id !== id));
  };

  // Header Row Handlers
  const addHeaderRow = () => {
    setHeaders([...headers, { id: Date.now().toString(), key: "", value: "", enabled: true }]);
  };
  const updateHeaderRow = (id, field, val) => {
    setHeaders(headers.map((h) => (h.id === id ? { ...h, [field]: val } : h)));
  };
  const deleteHeaderRow = (id) => {
    setHeaders(headers.filter((h) => h.id !== id));
  };

  // Import Postman JSON
  const handleImportPostman = () => {
    if (!postmanImportJson.trim()) return;

    try {
      const parsed = JSON.parse(postmanImportJson);
      let req = parsed.request || parsed;

      if (parsed.item && Array.isArray(parsed.item)) {
        req = parsed.item[0]?.request || req;
      }

      if (req.method) setMethod(req.method.toUpperCase());

      if (typeof req.url === "string") {
        setUrl(req.url);
      } else if (req.url?.raw) {
        setUrl(req.url.raw);
      }

      if (Array.isArray(req.header)) {
        setHeaders(
          req.header.map((h, i) => ({
            id: i.toString(),
            key: h.key || "",
            value: h.value || "",
            enabled: !h.disabled,
          }))
        );
      }

      if (req.body?.mode === "raw" && req.body.raw) {
        setBodyMode("json");
        setRawBody(req.body.raw);
      }

      setActiveReqTab("headers");
    } catch (err) {
      alert("Invalid Postman JSON structure.");
    }
  };

  // Send API Request via Node.js Backend Proxy (No CORS limits!)
  const handleSendRequest = async () => {
    if (!url.trim()) return;

    setLoading(true);
    setResponse(null);

    try {
      const reqHeaders = {};
      headers.forEach((h) => {
        if (h.enabled && h.key.trim()) {
          reqHeaders[h.key.trim()] = h.value;
        }
      });

      if (authType === "bearer" && authToken.trim()) {
        reqHeaders["Authorization"] = `Bearer ${authToken}`;
      }

      const res = await fetch(`${API_BASE_URL}/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          method,
          url,
          headers: reqHeaders,
          bodyMode,
          rawBody,
        }),
      });

      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setResponse({
        status: 0,
        statusText: "Server Error",
        ok: false,
        time: 0,
        size: "0 KB",
        data: { error: "Could not connect to backend proxy server." },
        headers: {},
      });
    } finally {
      setLoading(false);
    }
  };

  // Save Request to History DB
  const handleSaveRequest = async () => {
    if (!url.trim()) return;

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE_URL}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method,
          url,
          headers,
          params,
          bodyMode,
          rawBody,
          curlOutput: curlCommand,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
        fetchHistory();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Load Request from History
  const loadHistoryItem = (item) => {
    setMethod(item.method || "GET");
    setUrl(item.url || "");
    if (item.headers) setHeaders(item.headers);
    if (item.params) setParams(item.params);
    if (item.bodyMode) setBodyMode(item.bodyMode);
    if (item.rawBody) setRawBody(item.rawBody);
  };

  // Delete History Item
  const deleteHistoryItem = async (id, e) => {
    e.stopPropagation();
    try {
      await fetch(`${API_BASE_URL}/history/${id}`, { method: "DELETE" });
      fetchHistory();
    } catch (err) {}
  };

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex min-h-screen w-full bg-slate-950 text-white">
      
      {/* Left Sidebar: Request History */}
      <div className="hidden w-72 flex-col border-r border-slate-800/80 bg-slate-900/60 p-4 md:flex">
        <div className="mb-4 flex items-center gap-2 border-b border-slate-800 pb-3 text-sm font-bold text-slate-300">
          <History size={16} className="text-orange-400" />
          <span>History & Saved</span>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {historyList.length === 0 ? (
            <p className="text-center text-xs text-slate-600 py-8">No saved history yet.</p>
          ) : (
            historyList.map((item) => (
              <div
                key={item._id}
                onClick={() => loadHistoryItem(item)}
                className="group relative flex cursor-pointer items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 text-xs transition hover:border-orange-500/40 hover:bg-slate-900"
              >
                <div className="flex flex-col gap-1 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${METHOD_COLORS[item.method]}`}>
                      {item.method}
                    </span>
                    <span className="truncate font-mono text-[11px] text-slate-300">{item.url}</span>
                  </div>
                </div>

                <button
                  onClick={(e) => deleteHistoryItem(item._id, e)}
                  className="opacity-0 transition group-hover:opacity-100 text-slate-500 hover:text-rose-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Studio Area */}
      <div className="flex flex-1 flex-col p-4 sm:p-8">
        
        {/* Top App Bar */}
        <div className="mb-6 flex flex-col justify-between gap-4 border-b border-slate-800 pb-5 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/20">
              <Globe size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">
                MyBlog Testing Api
              </h1>
              <p className="text-xs text-slate-400">
                Execute APIs via Backend Proxy Engine & manage full HTTP lifecycle.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setPostmanImportJson(SAMPLE_POSTMAN_IMPORT);
                setActiveReqTab("import");
              }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-orange-400 transition hover:border-orange-500/40 hover:bg-slate-800"
            >
              <Sparkles size={14} />
              <span>Load Sample Request</span>
            </button>
          </div>
        </div>

        {/* Request Input Bar */}
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl backdrop-blur-xl sm:flex-row sm:items-center">
          
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className={`h-11 rounded-xl border px-3 text-xs font-extrabold outline-none transition ${METHOD_COLORS[method]} bg-slate-950`}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
          </select>

          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.example.com/v1/resource"
            className="h-11 flex-1 rounded-xl border border-slate-800 bg-slate-950 px-4 font-mono text-xs text-white placeholder:text-slate-600 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
          />

          <button
            onClick={handleSaveRequest}
            disabled={saving || !url.trim()}
            className="flex h-11 items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 px-4 text-xs font-semibold text-slate-300 transition hover:border-orange-500 hover:text-white disabled:opacity-40"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : saveSuccess ? <Check size={15} className="text-emerald-400" /> : <Save size={15} />}
            <span>{saveSuccess ? "Saved" : "Save"}</span>
          </button>

          <button
            onClick={handleSendRequest}
            disabled={loading}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-6 text-xs font-bold text-white shadow-lg shadow-orange-500/20 transition hover:opacity-95 active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send size={15} />
                <span>Send</span>
              </>
            )}
          </button>
        </div>

        {/* Main Split Screen */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          
          {/* Left Panel: Request Builder Tabs */}
          <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl backdrop-blur-xl">
            
            <div className="mb-4 flex items-center border-b border-slate-800 text-xs">
              <button
                onClick={() => setActiveReqTab("params")}
                className={`border-b-2 px-3.5 py-2.5 font-semibold transition ${
                  activeReqTab === "params" ? "border-orange-500 text-orange-400" : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                Params ({params.filter((p) => p.key).length})
              </button>
              <button
                onClick={() => setActiveReqTab("headers")}
                className={`border-b-2 px-3.5 py-2.5 font-semibold transition ${
                  activeReqTab === "headers" ? "border-orange-500 text-orange-400" : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                Headers ({headers.filter((h) => h.key).length})
              </button>
              <button
                onClick={() => setActiveReqTab("auth")}
                className={`border-b-2 px-3.5 py-2.5 font-semibold transition ${
                  activeReqTab === "auth" ? "border-orange-500 text-orange-400" : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                Auth
              </button>
              <button
                onClick={() => setActiveReqTab("body")}
                className={`border-b-2 px-3.5 py-2.5 font-semibold transition ${
                  activeReqTab === "body" ? "border-orange-500 text-orange-400" : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                Body
              </button>
              <button
                onClick={() => setActiveReqTab("import")}
                className={`border-b-2 px-3.5 py-2.5 font-semibold transition ${
                  activeReqTab === "import" ? "border-orange-500 text-orange-400" : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                Import
              </button>
              <button
                onClick={() => setActiveReqTab("curl")}
                className={`border-b-2 px-3.5 py-2.5 font-semibold transition ${
                  activeReqTab === "curl" ? "border-orange-500 text-orange-400" : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                cURL
              </button>
            </div>

            {/* TAB 1: Query Params */}
            {activeReqTab === "params" && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">URL Query Parameters</span>
                  <button
                    onClick={addParamRow}
                    className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-orange-400 hover:border-orange-500/40"
                  >
                    <Plus size={13} />
                    <span>Add Parameter</span>
                  </button>
                </div>

                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                  {params.map((p) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={p.enabled}
                        onChange={(e) => updateParamRow(p.id, "enabled", e.target.checked)}
                        className="h-4 w-4 rounded accent-orange-500"
                      />
                      <input
                        type="text"
                        placeholder="Key"
                        value={p.key}
                        onChange={(e) => updateParamRow(p.id, "key", e.target.value)}
                        className="w-1/2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:border-orange-500"
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        value={p.value}
                        onChange={(e) => updateParamRow(p.id, "value", e.target.value)}
                        className="w-1/2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:border-orange-500"
                      />
                      <button onClick={() => deleteParamRow(p.id)} className="text-slate-500 hover:text-rose-400">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: Headers */}
            {activeReqTab === "headers" && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">HTTP Request Headers</span>
                  <button
                    onClick={addHeaderRow}
                    className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-orange-400 hover:border-orange-500/40"
                  >
                    <Plus size={13} />
                    <span>Add Header</span>
                  </button>
                </div>

                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                  {headers.map((h) => (
                    <div key={h.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={h.enabled}
                        onChange={(e) => updateHeaderRow(h.id, "enabled", e.target.checked)}
                        className="h-4 w-4 rounded accent-orange-500"
                      />
                      <input
                        type="text"
                        placeholder="Key"
                        value={h.key}
                        onChange={(e) => updateHeaderRow(h.id, "key", e.target.value)}
                        className="w-1/2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:border-orange-500"
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        value={h.value}
                        onChange={(e) => updateHeaderRow(h.id, "value", e.target.value)}
                        className="w-1/2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:border-orange-500"
                      />
                      <button onClick={() => deleteHeaderRow(h.id)} className="text-slate-500 hover:text-rose-400">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: Auth */}
            {activeReqTab === "auth" && (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="mb-1.5 block text-xs text-slate-400">Auth Type</label>
                  <select
                    value={authType}
                    onChange={(e) => setAuthType(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-orange-500"
                  >
                    <option value="none">No Auth</option>
                    <option value="bearer">Bearer Token</option>
                  </select>
                </div>

                {authType === "bearer" && (
                  <div>
                    <label className="mb-1.5 block text-xs text-slate-400">Token</label>
                    <div className="relative">
                      <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={authToken}
                        onChange={(e) => setAuthToken(e.target.value)}
                        placeholder="Paste Bearer Token here..."
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-9 pr-3 text-xs text-white outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Body */}
            {activeReqTab === "body" && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-4 text-xs text-slate-300">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="bodyMode"
                      value="none"
                      checked={bodyMode === "none"}
                      onChange={() => setBodyMode("none")}
                      className="accent-orange-500"
                    />
                    <span>None</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="bodyMode"
                      value="json"
                      checked={bodyMode === "json"}
                      onChange={() => setBodyMode("json")}
                      className="accent-orange-500"
                    />
                    <span>JSON (raw)</span>
                  </label>
                </div>

                {bodyMode === "json" && (
                  <textarea
                    value={rawBody}
                    onChange={(e) => setRawBody(e.target.value)}
                    placeholder='{\n  "key": "value"\n}'
                    className="h-[260px] w-full resize-none rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-200 placeholder:text-slate-600 outline-none focus:border-orange-500"
                    spellCheck={false}
                  />
                )}
              </div>
            )}

            {/* TAB 5: Import */}
            {activeReqTab === "import" && (
              <div className="flex flex-col gap-3">
                <textarea
                  value={postmanImportJson}
                  onChange={(e) => setPostmanImportJson(e.target.value)}
                  placeholder="Paste Postman JSON Request or Collection here..."
                  className="h-[220px] w-full resize-none rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-200 placeholder:text-slate-600 outline-none focus:border-orange-500"
                  spellCheck={false}
                />
                <button
                  onClick={handleImportPostman}
                  className="rounded-xl bg-orange-500 py-2 text-xs font-bold text-white shadow-md hover:bg-orange-600"
                >
                  Parse & Load Request
                </button>
              </div>
            )}

            {/* TAB 6: cURL */}
            {activeReqTab === "curl" && (
              <div className="flex flex-col gap-3">
                <div className="flex justify-end">
                  <button
                    onClick={handleCopyCurl}
                    className="flex items-center gap-1.5 rounded-lg border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-400 hover:bg-orange-500 hover:text-white"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copied ? "Copied!" : "Copy cURL"}</span>
                  </button>
                </div>
                <textarea
                  readOnly
                  value={curlCommand}
                  className="h-[240px] w-full resize-none rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-orange-300 outline-none"
                  spellCheck={false}
                />
              </div>
            )}

          </div>

          {/* Right Panel: Response Viewer */}
          <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl backdrop-blur-xl">
            
            <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Response Output
              </span>

              {response && (
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 ${
                      response.ok
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    {response.ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                    {response.status} {response.statusText}
                  </span>

                  <span className="flex items-center gap-1 text-slate-400">
                    <Clock size={13} />
                    {response.time} ms
                  </span>

                  <span className="flex items-center gap-1 text-slate-400">
                    <Database size={13} />
                    {response.size}
                  </span>
                </div>
              )}
            </div>

            <div className="relative flex-1">
              {!response && !loading && (
                <div className="flex h-[320px] flex-col items-center justify-center text-slate-600">
                  <Globe size={40} className="mb-2 opacity-40" />
                  <p className="text-xs">Click 'Send' to execute request via Backend Proxy.</p>
                </div>
              )}

              {loading && (
                <div className="flex h-[320px] flex-col items-center justify-center gap-2 text-orange-400">
                  <Loader2 size={30} className="animate-spin" />
                  <span className="text-xs font-medium">Proxy Executing API Call...</span>
                </div>
              )}

              {response && !loading && (
                <textarea
                  readOnly
                  value={
                    typeof response.data === "object"
                      ? JSON.stringify(response.data, null, 2)
                      : response.data
                  }
                  className="h-[320px] w-full resize-none rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-200 outline-none"
                  spellCheck={false}
                />
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
