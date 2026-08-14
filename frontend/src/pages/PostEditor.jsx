
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";

// Standardized API Instance with Auth Token
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

import {
  ArrowLeft,
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link as LinkIcon,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Quote,
  Send,
  ChevronUp,
  ChevronRight,
  Loader2,
  Trash2,
  Globe,
  Tag,
  FolderOpen,
  FileText,
  Code,
  Sparkles,
  Upload,
} from "lucide-react";

export default function PostEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth(); // Logged-in Admin Info

  const isEditMode = Boolean(id);
  const editorRef = useRef(null);

  // =========================
  // STATE
  // =========================

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");

  const [category, setCategory] = useState("General");
  const [labels, setLabels] = useState("");
  const [coverImage, setCoverImage] = useState("");

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const [openSidebarSection, setOpenSidebarSection] = useState("labels");

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [selectedImage, setSelectedImage] = useState(null);

  const [toolbarPos, setToolbarPos] = useState({
    top: 0,
    left: 0,
  });

  // =========================
  // HELPER: GET USER ID
  // =========================

  const currentUserId = user?._id || user?.id || user?.userId;

  // =========================
  // SLUG GENERATOR
  // =========================

  const slugify = (text) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[\s\W-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleTitleChange = (e) => {
    const value = e.target.value;
    setTitle(value);

    if (!isEditMode) {
      setSlug(slugify(value));
    }
  };

  // =========================
  // EDITOR INPUT
  // =========================

  const handleEditorInput = () => {
    if (!editorRef.current) return;
    setContent(editorRef.current.innerHTML);
  };

  // =========================
  // LOAD POST (EDIT MODE)
  // =========================

  useEffect(() => {
    if (!isEditMode) return;

    const loadPost = async () => {
      try {
        setFetching(true);

        // Multi-route fallback logic to match backend endpoints
        let response = await api.get(`/blogs/id/${id}`).catch(() => null);
        if (!response?.data?.success && !response?.data?.blog) {
          response = await api.get(`/blogs/${id}`).catch(() => null);
        }
        if (!response?.data?.success && !response?.data?.blog) {
          response = await api.get(`/blogs/slug/${id}`).catch(() => null);
        }

        const data = response?.data;
        const post = data?.blog || data?.data || (data && !data.success ? null : data);

        if (post && (post.title || post.content)) {
          setTitle(post.title || "");
          setSlug(post.slug || "");
          setExcerpt(post.excerpt || "");
          setCategory(
            typeof post.category === "object"
              ? post.category?.name || "General"
              : post.category || "General"
          );
          setCoverImage(post.coverImage || "");

          setLabels(
            Array.isArray(post.tags)
              ? post.tags.join(", ")
              : post.tags || ""
          );

          const fetchedContent = post.content || "";
          setContent(fetchedContent);

          if (editorRef.current) {
            editorRef.current.innerHTML = fetchedContent;
          }
        } else {
          throw new Error("Article data not found.");
        }
      } catch (error) {
        console.error("Failed to load post:", error);
        alert(
          error.response?.data?.message ||
            error.message ||
            "Failed to load post for editing."
        );
      } finally {
        setFetching(false);
      }
    };

    loadPost();
  }, [id, isEditMode]);

  // =========================
  // EXECUTE COMMAND
  // =========================

  const executeCommand = (command, value = null) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    try {
      document.execCommand(command, false, value);
    } catch (error) {
      console.error("Command failed:", command, error);
    }

    handleEditorInput();
  };

  // =========================
  // NUMBERED LIST
  // =========================

  const insertNormalNumberedList = () => {
    executeCommand("insertOrderedList");
  };

  // =========================
  // LINK INSERT
  // =========================

  const handleInsertLink = () => {
    const url = linkUrl.trim();

    if (!url) {
      alert("Please enter a URL.");
      return;
    }

    editorRef.current?.focus();
    executeCommand("createLink", url);

    setLinkUrl("");
    setShowLinkModal(false);
  };

  // =========================
  // IMAGE URL INSERT
  // =========================

  const handleInsertImage = () => {
    const url = imageUrl.trim();

    if (!url) {
      alert("Please enter image URL.");
      return;
    }

    editorRef.current?.focus();
    executeCommand("insertImage", url);

    setImageUrl("");
    setShowImageModal(false);
  };

  // =========================
  // FILE UPLOAD
  // =========================

  const handleFileUpload = (e, target = "editor") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      return;
    }

    const reader = new FileReader();

    reader.onloadend = () => {
      const result = reader.result;

      if (target === "cover") {
        setCoverImage(result);
      } else {
        editorRef.current?.focus();
        executeCommand("insertImage", result);
      }
    };

    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // =========================
  // IMAGE CLICK CONTROL
  // =========================

  const handleEditorClick = (e) => {
    if (e.target.tagName === "IMG") {
      const img = e.target;
      setSelectedImage(img);

      if (!editorRef.current) return;

      const rect = img.getBoundingClientRect();
      const editorRect = editorRef.current.getBoundingClientRect();

      setToolbarPos({
        top: rect.top - editorRect.top - 50,
        left: rect.left - editorRect.left + rect.width / 2,
      });
    } else {
      setSelectedImage(null);
    }
  };

  // =========================
  // RESIZE IMAGE
  // =========================

  const resizeImage = (size) => {
    if (!selectedImage) return;

    selectedImage.style.maxHeight = "none";

    switch (size) {
      case "small":
        selectedImage.style.width = "250px";
        selectedImage.style.height = "auto";
        break;
      case "medium":
        selectedImage.style.width = "450px";
        selectedImage.style.height = "auto";
        break;
      case "large":
        selectedImage.style.width = "100%";
        selectedImage.style.height = "auto";
        break;
      case "original":
        selectedImage.style.width = "auto";
        selectedImage.style.height = "auto";
        break;
      default:
        break;
    }

    handleEditorInput();
  };

  // =========================
  // ALIGN IMAGE
  // =========================

  const alignImage = (align) => {
    if (!selectedImage) return;

    selectedImage.style.display = "block";

    if (align === "left") {
      selectedImage.style.marginLeft = "0";
      selectedImage.style.marginRight = "auto";
    }

    if (align === "center") {
      selectedImage.style.marginLeft = "auto";
      selectedImage.style.marginRight = "auto";
    }

    if (align === "right") {
      selectedImage.style.marginLeft = "auto";
      selectedImage.style.marginRight = "0";
    }

    handleEditorInput();
  };

  // =========================
  // DELETE IMAGE
  // =========================

  const deleteSelectedImage = () => {
    if (!selectedImage) return;
    selectedImage.remove();
    setSelectedImage(null);
    handleEditorInput();
  };

  // =========================
  // PUBLISH / DRAFT
  // =========================

  const handlePublish = async (postStatus = "published") => {
    const finalContent = editorRef.current
      ? editorRef.current.innerHTML
      : content;

    if (!title.trim()) {
      alert("Title is required.");
      return;
    }

    if (!finalContent.trim()) {
      alert("Content is required.");
      return;
    }

    setLoading(true);

    const tagsArray =
      typeof labels === "string"
        ? labels.split(",").map((t) => t.trim()).filter(Boolean)
        : labels;

    const payload = {
      title: title.trim(),
      slug: slug.trim() || slugify(title),
      excerpt: excerpt.trim(),
      content: finalContent,
      coverImage,
      category: category.trim() || "General",
      tags: tagsArray,
      status: postStatus,
      authorId: currentUserId,
      author: currentUserId,
    };

    try {
      if (isEditMode) {
        // UPDATE (PUT)
        let response;
        try {
          response = await api.put(`/blogs/${id}`, payload);
        } catch {
          response = await api.put(`/blogs/id/${id}`, payload);
        }

        alert(
          postStatus === "draft"
            ? "Draft Updated Successfully!"
            : "Post Updated Successfully!"
        );
      } else {
        // CREATE (POST)
        const response = await api.post(`/blogs`, payload);

        alert(
          postStatus === "draft"
            ? "Draft Saved Successfully!"
            : "Post Created Successfully!"
        );

        if (postStatus === "draft") {
          const newId =
            response.data?.blog?._id ||
            response.data?.blog?.id ||
            response.data?.id;

          if (newId) {
            navigate(`/edit/${newId}`, { replace: true });
            return;
          }
        }
      }

      if (postStatus === "published") {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("API Error:", error);
      const message =
        error.response?.data?.message ||
        "Failed to save post. Please check admin permissions.";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // LOADING STATE
  // =========================

  if (fetching) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="mt-3 text-xs font-semibold text-slate-400">
          Loading article details...
        </p>
      </div>
    );
  }

  // =========================
  // MAIN RENDER (DARK GLASS UI)
  // =========================

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 relative overflow-x-clip">
      
      {/* Background Glow Lights */}
      <div className="pointer-events-none absolute -top-40 left-1/4 h-[400px] w-[400px] rounded-full bg-indigo-600/10 blur-[130px]" />
      <div className="pointer-events-none absolute top-1/3 -right-20 h-[400px] w-[400px] rounded-full bg-amber-500/10 blur-[130px]" />

      {/* TOP HEADER */}
      <header className="h-16 bg-slate-950/80 border-b border-white/10 px-6 flex items-center justify-between shrink-0 sticky top-16 z-30 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 border border-white/10 bg-white/5 hover:bg-white/10 rounded-xl text-slate-300 transition-all active:scale-95"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-tr from-[#ff6f00] via-amber-500 to-amber-400 rounded-xl flex items-center justify-center text-slate-950 font-black text-base shadow-lg shadow-amber-500/20">
              B
            </div>

            <div>
              <h1 className="text-sm font-bold text-white leading-tight">
                {isEditMode ? "Edit Article" : "Create New Article"}
              </h1>
              <p className="text-[11px] font-medium text-slate-400">
                {user ? `Logged in as Admin (${user.name || user.email})` : "Admin Mode"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handlePublish("draft")}
            disabled={loading}
            className="px-4 py-2 text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            Save Draft
          </button>

          <button
            onClick={() => handlePublish("published")}
            disabled={loading}
            className="px-5 py-2 bg-gradient-to-r from-[#ff6f00] via-amber-500 to-amber-400 hover:opacity-90 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
            ) : (
              <Send className="w-3.5 h-3.5 fill-slate-950" />
            )}

            {isEditMode ? "Update Post" : "Publish Post"}
          </button>
        </div>
      </header>

      {/* TITLE & FORMATTING TOOLBAR */}
      <div className="bg-slate-900/60 border-b border-white/10 sticky top-32 z-20 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 pt-5 pb-3">
          <input
            type="text"
            placeholder="Title of your post..."
            value={title}
            onChange={handleTitleChange}
            className="w-full text-2xl sm:text-3xl font-extrabold text-white placeholder:text-slate-600 outline-none bg-transparent border-b border-white/10 focus:border-amber-500 pb-2 transition-all"
          />
        </div>

        {/* TOOLBAR BUTTONS */}
        <div className="border-t border-white/10 bg-slate-950/40 px-6 py-2">
          <div className="max-w-5xl mx-auto flex items-center gap-1 overflow-x-auto text-slate-300 text-xs no-scrollbar">
            
            <div className="flex items-center gap-0.5 pr-2">
              <button
                onClick={() => executeCommand("undo")}
                className="p-1.5 hover:bg-white/10 rounded-lg transition"
                title="Undo"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => executeCommand("redo")}
                className="p-1.5 hover:bg-white/10 rounded-lg transition"
                title="Redo"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </div>

            <div className="h-4 w-px bg-white/10 mx-1" />

            <select
              onChange={(e) => executeCommand("formatBlock", e.target.value)}
              className="bg-slate-950 text-xs font-semibold px-2.5 py-1.5 border border-white/10 rounded-lg outline-none text-slate-200 cursor-pointer"
              defaultValue="p"
            >
              <option value="p">Paragraph</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
            </select>

            <div className="h-4 w-px bg-white/10 mx-1" />

            <div className="flex items-center gap-0.5">
              <button
                onClick={() => executeCommand("bold")}
                className="p-1.5 hover:bg-white/10 rounded-lg font-bold transition"
                title="Bold"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                onClick={() => executeCommand("italic")}
                className="p-1.5 hover:bg-white/10 rounded-lg italic transition"
                title="Italic"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                onClick={() => executeCommand("underline")}
                className="p-1.5 hover:bg-white/10 rounded-lg underline transition"
                title="Underline"
              >
                <Underline className="w-4 h-4" />
              </button>
              <button
                onClick={() => executeCommand("strikeThrough")}
                className="p-1.5 hover:bg-white/10 rounded-lg line-through transition"
                title="Strikethrough"
              >
                <Strikethrough className="w-4 h-4" />
              </button>
              <button
                onClick={() => executeCommand("formatBlock", "pre")}
                className="p-1.5 hover:bg-white/10 rounded-lg font-mono transition text-indigo-400"
                title="Code Block"
              >
                <Code className="w-4 h-4" />
              </button>
            </div>

            <div className="h-4 w-px bg-white/10 mx-1" />

            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setShowLinkModal(true)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-indigo-400 transition"
                title="Insert Link"
              >
                <LinkIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowImageModal(true)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-emerald-400 transition"
                title="Insert Image"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="h-4 w-px bg-white/10 mx-1" />

            <div className="flex items-center gap-0.5">
              <button
                onClick={() => executeCommand("justifyLeft")}
                className="p-1.5 hover:bg-white/10 rounded-lg transition"
                title="Align Left"
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => executeCommand("justifyCenter")}
                className="p-1.5 hover:bg-white/10 rounded-lg transition"
                title="Align Center"
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              <button
                onClick={() => executeCommand("justifyRight")}
                className="p-1.5 hover:bg-white/10 rounded-lg transition"
                title="Align Right"
              >
                <AlignRight className="w-4 h-4" />
              </button>
            </div>

            <div className="h-4 w-px bg-white/10 mx-1" />

            <div className="flex items-center gap-0.5">
              <button
                onClick={() => executeCommand("insertUnorderedList")}
                className="p-1.5 hover:bg-white/10 rounded-lg transition"
                title="Bullet List"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={insertNormalNumberedList}
                className="p-1.5 hover:bg-white/10 rounded-lg transition"
                title="Numbered List"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <button
                onClick={() => executeCommand("formatBlock", "blockquote")}
                className="p-1.5 hover:bg-white/10 rounded-lg transition"
                title="Blockquote"
              >
                <Quote className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-visible">
        {/* EDITOR CANVAS */}
        <div className="flex-1 p-6 sm:p-10 flex justify-center relative">
          <div className="relative w-full max-w-3xl">

            {/* FLOATING IMAGE TOOLBAR */}
            {selectedImage && (
              <div
                style={{
                  top: `${Math.max(toolbarPos.top, 0)}px`,
                  left: `${toolbarPos.left}px`,
                  transform: "translateX(-50%)",
                }}
                className="absolute z-30 bg-slate-900 border border-white/20 text-white rounded-2xl shadow-2xl p-2 flex items-center gap-2 text-xs backdrop-blur-xl"
              >
                <span className="text-slate-400 font-bold px-1 text-[10px] uppercase">Size:</span>
                <button onClick={() => resizeImage("small")} className="px-2 py-1 hover:bg-white/10 rounded-lg">Small</button>
                <button onClick={() => resizeImage("medium")} className="px-2 py-1 hover:bg-white/10 rounded-lg">Medium</button>
                <button onClick={() => resizeImage("large")} className="px-2 py-1 hover:bg-white/10 rounded-lg">Full</button>
                <button onClick={() => resizeImage("original")} className="px-2 py-1 hover:bg-white/10 rounded-lg">Original</button>
                <div className="h-4 w-px bg-white/20 mx-0.5" />
                <button onClick={() => alignImage("left")} className="p-1.5 hover:bg-white/10 rounded-lg"><AlignLeft className="w-3.5 h-3.5" /></button>
                <button onClick={() => alignImage("center")} className="p-1.5 hover:bg-white/10 rounded-lg"><AlignCenter className="w-3.5 h-3.5" /></button>
                <button onClick={() => alignImage("right")} className="p-1.5 hover:bg-white/10 rounded-lg"><AlignRight className="w-3.5 h-3.5" /></button>
                <div className="h-4 w-px bg-white/20 mx-0.5" />
                <button onClick={deleteSelectedImage} className="p-1.5 bg-rose-500/20 text-rose-300 hover:bg-rose-600 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            )}

            {/* CONTENT EDITABLE AREA */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleEditorInput}
              onClick={handleEditorClick}
              data-placeholder="Start writing your article content here..."
              className="
                w-full
                bg-slate-900/60
                min-h-[700px]
                shadow-2xl
                border
                border-white/10
                rounded-3xl
                p-8
                sm:p-12
                outline-none
                text-slate-100
                text-base
                leading-relaxed
                prose
                prose-invert
                max-w-none

                empty:before:content-[attr(data-placeholder)]
                empty:before:text-slate-500
                empty:before:pointer-events-none

                [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mt-6 [&_h1]:mb-3
                [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-5 [&_h2]:mb-2
                [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-slate-100 [&_h3]:mt-4 [&_h3]:mb-2
                [&_blockquote]:border-l-4 [&_blockquote]:border-amber-500 [&_blockquote]:bg-white/5 [&_blockquote]:py-2 [&_blockquote]:px-5 [&_blockquote]:rounded-r-xl [&_blockquote]:italic [&_blockquote]:my-4
                [&_pre]:bg-slate-950 [&_pre]:border [&_pre]:border-indigo-500/50 [&_pre]:rounded-2xl [&_pre]:p-5 [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:font-mono [&_pre]:text-sm [&_pre]:text-slate-200 [&_pre]:shadow-2xl
                [&_code]:bg-slate-950 [&_code]:text-indigo-300 [&_code]:px-2 [&_code]:py-1 [&_code]:rounded-md [&_code]:font-mono [&_code]:text-xs [&_code]:border [&_code]:border-indigo-500/30
                [&_img]:cursor-pointer [&_img]:rounded-2xl [&_img]:border [&_img]:border-white/10 [&_img]:my-4
                [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-3
                [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3
                [&_a]:text-amber-400 [&_a]:underline
              "
            />
          </div>
        </div>

        {/* SIDEBAR SETTINGS */}
        <aside className="w-80 bg-slate-900/60 border-l border-white/10 shrink-0 p-5 space-y-5 backdrop-blur-xl sticky top-32 h-[calc(100vh-8rem)] overflow-y-auto">
          <div className="flex items-center gap-2 text-slate-200 font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Article Settings
          </div>

          {/* PERMALINK / SLUG */}
          <div className="border-b border-white/10 pb-4">
            <button
              onClick={() => setOpenSidebarSection(openSidebarSection === "slug" ? null : "slug")}
              className="w-full flex items-center justify-between p-2.5 text-xs text-slate-200 font-bold hover:bg-white/5 rounded-xl transition"
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-400" />
                <span>Permalink / Slug</span>
              </div>
              {openSidebarSection === "slug" ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>

            {openSidebarSection === "slug" && (
              <div className="px-2 pt-2 space-y-2">
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  className="w-full text-xs p-2.5 border border-white/10 bg-slate-950/60 focus:border-amber-500 rounded-xl outline-none font-mono text-slate-200"
                />
              </div>
            )}
          </div>

          {/* LABELS / TAGS */}
          <div className="border-b border-white/10 pb-4">
            <button
              onClick={() => setOpenSidebarSection(openSidebarSection === "labels" ? null : "labels")}
              className="w-full flex items-center justify-between p-2.5 text-xs text-slate-200 font-bold hover:bg-white/5 rounded-xl transition"
            >
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-slate-400" />
                <span>Labels / Tags</span>
              </div>
              {openSidebarSection === "labels" ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>

            {openSidebarSection === "labels" && (
              <div className="px-2 pt-2 space-y-2">
                <input
                  type="text"
                  placeholder="React, Express, MongoDB"
                  value={labels}
                  onChange={(e) => setLabels(e.target.value)}
                  className="w-full text-xs p-2.5 border border-white/10 bg-slate-950/60 focus:border-amber-500 rounded-xl outline-none text-slate-200"
                />
              </div>
            )}
          </div>

          {/* CATEGORY & EXCERPT */}
          <div className="border-b border-white/10 pb-4 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 flex items-center gap-2 mb-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs p-2.5 border border-white/10 bg-slate-950/60 focus:border-amber-500 rounded-xl outline-none text-slate-200"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 flex items-center gap-2 mb-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Excerpt / Summary
              </label>
              <textarea
                rows={3}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Brief summary..."
                className="w-full text-xs p-2.5 border border-white/10 bg-slate-950/60 focus:border-amber-500 rounded-xl outline-none resize-none text-slate-200"
              />
            </div>
          </div>

          {/* COVER IMAGE */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
              Cover Image URL
            </label>

            <input
              type="text"
              placeholder="https://example.com/image.jpg"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              className="w-full text-xs p-2.5 border border-white/10 bg-slate-950/60 focus:border-amber-500 rounded-xl outline-none text-slate-200"
            />

            <label className="flex flex-col items-center justify-center p-3 border border-dashed border-white/20 hover:border-amber-500 rounded-2xl cursor-pointer bg-white/5 transition">
              <Upload className="w-4 h-4 text-slate-400 mb-1" />
              <span className="text-xs font-medium text-slate-300">Choose File</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, "cover")}
                className="hidden"
              />
            </label>

            {coverImage && (
              <div className="relative mt-2 rounded-2xl overflow-hidden border border-white/10 group">
                <img src={coverImage} alt="Cover Preview" className="w-full h-28 object-cover" />
                <button
                  type="button"
                  onClick={() => setCoverImage("")}
                  className="absolute top-2 right-2 p-1.5 bg-slate-950/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* LINK MODAL */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white">Insert Link</h3>
            <input
              type="url"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="w-full p-3 border border-white/10 bg-slate-950 rounded-xl text-xs outline-none focus:border-amber-500 font-mono text-slate-200"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => { setLinkUrl(""); setShowLinkModal(false); }} className="px-4 py-2 text-slate-400 text-xs font-semibold hover:bg-white/5 rounded-xl">Cancel</button>
              <button onClick={handleInsertLink} className="px-5 py-2 bg-gradient-to-r from-[#ff6f00] to-amber-500 text-slate-950 rounded-xl text-xs font-bold">Insert</button>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE MODAL */}
      {showImageModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white">Insert Image</h3>
            <input
              type="url"
              placeholder="Image Web URL (https://...)"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full p-3 border border-white/10 bg-slate-950 rounded-xl text-xs outline-none focus:border-amber-500 text-slate-200"
            />
            <label className="flex flex-col items-center justify-center p-4 border border-dashed border-white/20 hover:border-amber-500 rounded-2xl cursor-pointer bg-white/5 transition">
              <Upload className="w-5 h-5 text-slate-400 mb-1" />
              <span className="text-xs font-medium text-slate-300">Choose Image File</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  handleFileUpload(e, "editor");
                  setShowImageModal(false);
                }}
                className="hidden"
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => { setImageUrl(""); setShowImageModal(false); }} className="px-4 py-2 text-slate-400 text-xs font-semibold hover:bg-white/5 rounded-xl">Cancel</button>
              <button onClick={handleInsertImage} className="px-5 py-2 bg-gradient-to-r from-[#ff6f00] to-amber-500 text-slate-950 rounded-xl text-xs font-bold">Insert</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}