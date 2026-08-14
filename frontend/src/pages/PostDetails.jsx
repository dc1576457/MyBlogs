import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  Calendar,
  Clock,
  User,
  MessageSquare,
  Lock,
  LogIn,
  Send,
  Trash2,
  ArrowLeft,
  X,
  Check,
  AlertCircle,
  Sparkles,
  BookOpen,
  ChevronRight,
  Quote,
  Tag,
  Share2,
} from "lucide-react";

import api from "../api/axios";

import {
  useAuth,
} from "../context/AuthContext";

export default function PostDetails() {
 
  const { slug } = useParams();

  const navigate = useNavigate();

  const {
    user,
    loading: authLoading,
  } = useAuth();

  // ==================================================
  // ARTICLE STATE
  // ==================================================

  const [blog, setBlog] = useState(null);

  const [access, setAccess] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // ==================================================
  // SCROLL ANIMATION STATE (FOR GUEST USERS)
  // ==================================================

  const [hasScrolledOneScreen, setHasScrolledOneScreen] =
    useState(false);

  // ==================================================
  // COMMENTS
  // ==================================================

  const [commentText, setCommentText] = useState("");

  const [commentLoading, setCommentLoading] =
    useState(false);

  const [deletingCommentId, setDeletingCommentId] =
    useState(null);

  // ==================================================
  // RELATED POSTS
  // ==================================================

  const [relatedPosts, setRelatedPosts] =
    useState([]);

  const [relatedLoading, setRelatedLoading] =
    useState(false);

  // ==================================================
  // ALERT MODAL
  // ==================================================

  const [alertModal, setAlertModal] = useState({
    open: false,
    title: "Message",
    message: "",
    type: "error",
  });

  // ==================================================
  // DELETE MODAL
  // ==================================================

  const [deleteModal, setDeleteModal] = useState({
    open: false,
    commentId: null,
  });

  // ==================================================
  // SHOW ALERT
  // ==================================================

  const showAlert = useCallback(
    (
      message,
      title = "Message",
      type = "error"
    ) => {
      setAlertModal({
        open: true,
        title,
        message,
        type,
      });
    },
    []
  );

  // ==================================================
  // CLOSE ALERT
  // ==================================================

  const closeAlert = useCallback(() => {
    setAlertModal({
      open: false,
      title: "Message",
      message: "",
      type: "error",
    });
  }, []);

  // ==================================================
  // SHARE ARTICLE
  // ==================================================

  const handleShare = useCallback(
    async () => {
      if (!blog) {
        return;
      }

      const shareData = {
        title: blog.title || "Article",
        text:
          blog.excerpt ||
          blog.title ||
          "",
        url: window.location.href,
      };

      if (
        navigator.share &&
        typeof navigator.share === "function"
      ) {
        try {
          await navigator.share(
            shareData
          );
        } catch (err) {
          if (
            err?.name !==
            "AbortError"
          ) {
            console.error(
              "Share error:",
              err
            );
          }
        }

        return;
      }

      try {
        if (
          navigator.clipboard &&
          navigator.clipboard.writeText
        ) {
          await navigator.clipboard.writeText(
            window.location.href
          );

          showAlert(
            "Article link copied to clipboard!",
            "Shared",
            "success"
          );
        } else {
          showAlert(
            "Clipboard is not supported in this browser.",
            "Share Failed"
          );
        }
      } catch (err) {
        console.error(
          "Clipboard error:",
          err
        );

        showAlert(
          "Failed to copy article link.",
          "Share Failed"
        );
      }
    },
    [blog, showAlert]
  );

  // ==================================================
  // GET USER ID
  // ==================================================

  const getUserId = useCallback(
    (value) => {
      if (!value) {
        return null;
      }

      if (
        typeof value === "object"
      ) {
        return (
          value._id ||
          value.id ||
          value.userId ||
          value.user?._id ||
          value.user?.id ||
          null
        );
      }

      return value;
    },
    []
  );

  // ==================================================
  // GET STORED TOKEN
  // ==================================================

  const getStoredToken = useCallback(
    () => {
      const possibleKeys = [
        "token",
        "accessToken",
        "authToken",
        "jwt",
        "userToken",
      ];

      for (
        const key of possibleKeys
      ) {
        const value =
          localStorage.getItem(
            key
          );

        if (value) {
          return value;
        }
      }

      return null;
    },
    []
  );

  // ==================================================
  // APPLY AUTHORIZATION
  // ==================================================

  const applyAuthToken =
    useCallback(() => {
      const token =
        getStoredToken();

      if (token) {
        api.defaults.headers.common.Authorization =
          token.startsWith("Bearer ")
            ? token
            : `Bearer ${token}`;

        return token;
      }

      delete api.defaults.headers.common
        .Authorization;

      return null;
    }, [getStoredToken]);

  // ==================================================
  // ALWAYS START FROM TOP
  // ==================================================

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, [slug]);

  // ==================================================
  // PREVENT SCROLL RESTORATION
  // ==================================================

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !(
        "scrollRestoration" in
        window.history
      )
    ) {
      return;
    }

    const previous =
      window.history
        .scrollRestoration;

    window.history.scrollRestoration =
      "manual";

    return () => {
      window.history.scrollRestoration =
        previous;
    };
  }, []);

  // ==================================================
  // SCROLL DETECTION FOR UNLOCK ANIMATION
  // ==================================================

  const isPreview = !user && access === "preview";

  useEffect(() => {
    if (!isPreview) {
      setHasScrolledOneScreen(false);
      return;
    }

    const handleScroll = () => {
      if (window.scrollY > 150) {
        setHasScrolledOneScreen(true);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [isPreview]);

  // ==================================================
  // RELATED POSTS
  // ==================================================

  const fetchRelatedPosts =
    useCallback(
      async (currentBlog) => {
        if (!currentBlog) {
          return;
        }

        try {
          setRelatedLoading(true);

          if (
            Array.isArray(
              currentBlog.related
            )
          ) {
            setRelatedPosts(
              currentBlog.related
                .slice(0, 5)
            );

            return;
          }

          const categoryVal =
            typeof currentBlog.category ===
            "object"
              ? currentBlog.category
                  ?._id ||
                currentBlog.category
                  ?.name
              : currentBlog.category;

          let response = null;

          if (categoryVal) {
            response =
              await api
                .get(
                  "/blogs",
                  {
                    params: {
                      category:
                        categoryVal,
                      limit: 10,
                    },
                  }
                )
                .catch(
                  () => null
                );
          }

          if (
            !response?.data
              ?.success
          ) {
            response =
              await api
                .get("/blogs")
                .catch(
                  () => null
                );
          }

          if (
            response?.data
              ?.success
          ) {
            const allBlogs =
              response.data
                .blogs ||
              response.data
                .data ||
              response.data
                .posts ||
              (Array.isArray(
                response.data
              )
                ? response.data
                : []);

            const filtered =
              allBlogs
                .filter(
                  (item) =>
                    String(
                      item._id
                    ) !==
                      String(
                        currentBlog._id
                      ) &&
                    String(
                      item.slug ||
                        ""
                    ) !==
                      String(
                        currentBlog.slug ||
                          ""
                      )
                )
                .slice(0, 5);

            setRelatedPosts(
              filtered
            );
          } else {
            setRelatedPosts([]);
          }
        } catch (err) {
          console.error(
            "RELATED POSTS ERROR:",
            err
          );

          setRelatedPosts([]);
        } finally {
          setRelatedLoading(
            false
          );
        }
      },
      []
    );

  // ==================================================
  // FETCH ARTICLE
  // ==================================================

  const fetchArticle =
    useCallback(
      async () => {
        if (!slug) {
          setError(
            "Article slug is missing."
          );

          setLoading(false);

          return;
        }

        try {
          setLoading(true);

          setError("");

          setBlog(null);

          setAccess(null);

          const token =
            applyAuthToken();

          const response =
            await api.get(
              `/blogs/slug/${encodeURIComponent(
                slug
              )}`,
              {
                headers: token
                  ? {
                      Authorization:
                        token.startsWith(
                          "Bearer "
                        )
                          ? token
                          : `Bearer ${token}`,
                    }
                  : {},
              }
            );

          if (
            response.data?.success
          ) {
            const blogData =
              response.data
                .blog ||
              response.data
                .data ||
              response.data
                .post;

            if (!blogData) {
              setError(
                "Article data was not found."
              );

              return;
            }

            setBlog(blogData);

            const serverAccess =
              response.data
                .access;

            if (
              serverAccess ===
              "full"
            ) {
              setAccess(
                "full"
              );
            } else if (
              serverAccess ===
              "preview"
            ) {
              setAccess(
                "preview"
              );
            } else {
              setAccess(
                user
                  ? "full"
                  : "preview"
              );
            }

            fetchRelatedPosts(
              blogData
            );

            return;
          }

          setError(
            response.data
              ?.message ||
              "Failed to load article."
          );
        } catch (err) {
          console.error(
            "ARTICLE ERROR:",
            err
          );

          if (
            err.response?.status ===
              401 &&
            getStoredToken()
          ) {
            try {
              const keys = [
                "token",
                "accessToken",
                "authToken",
                "jwt",
                "userToken",
              ];

              keys.forEach(
                (key) => {
                  localStorage.removeItem(
                    key
                  );
                }
              );

              delete api.defaults
                .headers.common
                .Authorization;

              const publicResponse =
                await api.get(
                  `/blogs/slug/${encodeURIComponent(
                    slug
                  )}`
                );

              if (
                publicResponse
                  .data
                  ?.success
              ) {
                const publicBlog =
                  publicResponse
                    .data
                    .blog ||
                  publicResponse
                    .data
                    .data ||
                  publicResponse
                    .data
                    .post;

                if (publicBlog) {
                  setBlog(
                    publicBlog
                  );

                  setAccess(
                    publicResponse
                      .data
                      .access ===
                      "full"
                      ? "full"
                      : "preview"
                  );

                  fetchRelatedPosts(
                    publicBlog
                  );

                  return;
                }
              }
            } catch (
              retryError
            ) {
              console.error(
                "PUBLIC ARTICLE RETRY ERROR:",
                retryError
              );
            }
          }

          setError(
            err.response?.data
              ?.message ||
              "Failed to load article."
          );
        } finally {
          setLoading(false);
        }
      },
      [
        slug,
        user,
        applyAuthToken,
        fetchRelatedPosts,
        getStoredToken,
      ]
    );

  // ==================================================
  // FETCH AFTER AUTH RESTORED
  // ==================================================

  useEffect(() => {
    if (authLoading) {
      return;
    }

    fetchArticle();
  }, [
    authLoading,
    user,
    slug,
    fetchArticle,
  ]);

  // ==================================================
  // LOGIN
  // ==================================================

  const handleLogin = useCallback(
    () => {
      const currentPath =
        `/blogs/${encodeURIComponent(
          slug
        )}`;

      navigate("/login", {
        state: {
          from: currentPath,
          reason:
            "read-full-blog",
        },
      });
    },
    [navigate, slug]
  );

  // ==================================================
  // COMMENT OWNER
  // ==================================================

  const isCommentOwner =
    useCallback(
      (comment) => {
        if (!user || !comment) {
          return false;
        }

        const currentUserId =
          getUserId(user);

        const commentUserId =
          getUserId(
            comment.user
          );

        if (
          !currentUserId ||
          !commentUserId
        ) {
          return false;
        }

        return (
          String(
            currentUserId
          ) ===
          String(
            commentUserId
          )
        );
      },
      [user, getUserId]
    );

  // ==================================================
  // CAN DELETE COMMENT
  // ==================================================

  const canDeleteComment =
    useCallback(
      (comment) => {
        if (!user || !comment) {
          return false;
        }

        const role =
          String(
            user.role || ""
          ).toLowerCase();

        if (
          role === "admin"
        ) {
          return true;
        }

        return isCommentOwner(
          comment
        );
      },
      [
        user,
        isCommentOwner,
      ]
    );

  // ==================================================
  // POST COMMENT
  // ==================================================

  const handleComment =
    async (e) => {
      e.preventDefault();

      if (!user) {
        handleLogin();

        return;
      }

      if (!blog?._id) {
        showAlert(
          "Blog information is missing.",
          "Unable to Post Comment"
        );

        return;
      }

      const currentUserId =
        getUserId(user);

      if (!currentUserId) {
        showAlert(
          "User information is missing. Please login again.",
          "Authentication Required"
        );

        handleLogin();

        return;
      }

      const text =
        String(
          commentText || ""
        ).trim();

      if (!text) {
        return;
      }

      if (
        text.length > 2000
      ) {
        showAlert(
          "Comment cannot exceed 2000 characters.",
          "Comment Too Long"
        );

        return;
      }

      try {
        setCommentLoading(
          true
        );

        applyAuthToken();

        const response =
          await api.post(
            `/blogs/${blog._id}/comments`,
            {
              text,
            }
          );

        if (
          response.data
            ?.success &&
          response.data
            ?.comment
        ) {
          const newComment =
            response.data
              .comment;

          setCommentText("");

          setBlog(
            (previous) => {
              if (!previous) {
                return previous;
              }

              return {
                ...previous,

                comments: [
                  newComment,
                  ...(previous.comments ||
                    []),
                ],
              };
            }
          );

          return;
        }

        throw new Error(
          response.data
            ?.message ||
            "Failed to post comment."
        );
      } catch (err) {
        console.error(
          "COMMENT POST ERROR:",
          err
        );

        if (
          err.response?.status ===
          401
        ) {
          showAlert(
            err.response?.data
              ?.message ||
              "Your session has expired. Please login again.",
            "Session Expired"
          );

          return;
        }

        showAlert(
          err.response?.data
            ?.message ||
            err.message ||
            "Failed to post comment.",
          "Comment Failed"
        );
      } finally {
        setCommentLoading(
          false
        );
      }
    };

  // ==================================================
  // DELETE COMMENT
  // ==================================================

  const handleDeleteComment =
    (commentId) => {
      if (!user) {
        handleLogin();

        return;
      }

      if (!blog?._id) {
        showAlert(
          "Blog information is missing.",
          "Unable to Delete"
        );

        return;
      }

      if (!commentId) {
        showAlert(
          "Comment ID is missing.",
          "Unable to Delete"
        );

        return;
      }

      const comment =
        (
          blog.comments || []
        ).find(
          (item) =>
            String(
              item._id
            ) ===
            String(
              commentId
            )
        );

      if (!comment) {
        showAlert(
          "Comment not found.",
          "Unable to Delete"
        );

        return;
      }

      if (
        !canDeleteComment(
          comment
        )
      ) {
        showAlert(
          "You can delete only your own comment.",
          "Permission Denied"
        );

        return;
      }

      setDeleteModal({
        open: true,
        commentId,
      });
    };

  // ==================================================
  // CLOSE DELETE MODAL
  // ==================================================

  const closeDeleteModal =
    () => {
      if (
        deletingCommentId
      ) {
        return;
      }

      setDeleteModal({
        open: false,
        commentId: null,
      });
    };

  // ==================================================
  // CONFIRM DELETE
  // ==================================================

  const confirmDeleteComment =
    async () => {
      const commentId =
        deleteModal.commentId;

      if (!commentId) {
        closeDeleteModal();

        return;
      }

      try {
        setDeletingCommentId(
          commentId
        );

        applyAuthToken();

        const response =
          await api.delete(
            `/blogs/${blog._id}/comments/${commentId}`
          );

        if (
          response.data
            ?.success
        ) {
          setBlog(
            (previous) => {
              if (!previous) {
                return previous;
              }

              return {
                ...previous,

                comments: (
                  previous.comments ||
                  []
                ).filter(
                  (item) =>
                    String(
                      item._id
                    ) !==
                    String(
                      commentId
                    )
                ),
              };
            }
          );

          setDeleteModal({
            open: false,
            commentId: null,
          });

          return;
        }

        throw new Error(
          response.data
            ?.message ||
            "Failed to delete comment."
        );
      } catch (err) {
        console.error(
          "DELETE COMMENT ERROR:",
          err
        );

        setDeleteModal({
          open: false,
          commentId: null,
        });

        if (
          err.response?.status ===
          401
        ) {
          showAlert(
            err.response?.data
              ?.message ||
              "Your session has expired. Please login again.",
            "Session Expired"
          );

          return;
        }

        if (
          err.response?.status ===
          403
        ) {
          showAlert(
            err.response?.data
              ?.message ||
              "You are not allowed to delete this comment.",
            "Permission Denied"
          );

          return;
        }

        showAlert(
          err.response?.data
            ?.message ||
            err.message ||
            "Failed to delete comment.",
          "Delete Failed"
        );
      } finally {
        setDeletingCommentId(
          null
        );
      }
    };

  // ==================================================
  // PREVIEW CONTENT (~1 Screen teaser for guest users)
  // ==================================================

  const getPreviewContent =
    useCallback(
      (html) => {
        if (!html) {
          return "";
        }

        if (
          typeof window ===
            "undefined" ||
          typeof DOMParser ===
            "undefined"
        ) {
          return html;
        }

        const parser =
          new DOMParser();

        const doc =
          parser.parseFromString(
            html,
            "text/html"
          );

        // Approximately ~1 screen of text & initial code (120 words)
        const MAX_WORDS = 120;

        let wordCount = 0;

        let reachedLimit =
          false;

        const walker =
          doc.createTreeWalker(
            doc.body,
            NodeFilter.SHOW_TEXT,
            {
              acceptNode:
                (node) => {
                  let parent =
                    node.parentElement;

                  while (
                    parent &&
                    parent !==
                      doc.body
                  ) {
                    if (
                      parent.tagName ===
                        "PRE" ||
                      parent.tagName ===
                        "CODE"
                    ) {
                      return NodeFilter.FILTER_REJECT;
                    }

                    parent =
                      parent.parentElement;
                  }

                  return NodeFilter.FILTER_ACCEPT;
                },
            }
          );

        const textNodes = [];

        let node;

        while (
          (node =
            walker.nextNode())
        ) {
          textNodes.push(
            node
          );
        }

        for (
          const textNode of textNodes
        ) {
          if (reachedLimit) {
            textNode.textContent =
              "";

            continue;
          }

          const text =
            textNode.textContent ||
            "";

          const words =
            text
              .trim()
              .split(/\s+/)
              .filter(Boolean);

          if (
            words.length ===
            0
          ) {
            continue;
          }

          const remaining =
            MAX_WORDS -
            wordCount;

          if (
            words.length <=
            remaining
          ) {
            wordCount +=
              words.length;
          } else {
            const previewWords =
              words.slice(
                0,
                remaining
              );

            textNode.textContent =
              previewWords.join(
                " "
              ) + "...";

            wordCount =
              MAX_WORDS;

            reachedLimit =
              true;
          }
        }

        let removed = true;

        while (removed) {
          removed = false;

          const elements =
            Array.from(
              doc.body.querySelectorAll(
                "*"
              )
            );

          elements.forEach(
            (el) => {
              const tag =
                el.tagName;

              const protectedTag =
                tag === "PRE" ||
                tag === "CODE";

              const voidTag =
                [
                  "IMG",
                  "BR",
                  "HR",
                  "INPUT",
                  "IFRAME",
                  "EMBED",
                  "VIDEO",
                ].includes(
                  tag
                );

              if (
                !protectedTag &&
                !voidTag &&
                !el.textContent
                  ?.trim()
              ) {
                el.remove();

                removed = true;
              }
            }
          );
        }

        return doc.body.innerHTML;
      },
      []
    );

  // ==================================================
  // DERIVED DATA & PREVIEW
  // ==================================================

  const comments =
    blog?.comments || [];

  const categoryName =
    typeof blog?.category ===
    "object"
      ? blog?.category?.name
      : blog?.category;

  // Logged-in users get 100% full content; Guest gets preview
  const displayedContent =
    isPreview
      ? getPreviewContent(
          blog?.content || ""
        )
      : blog?.content || "";

  // ==================================================
  // AUTO DETECT & ATTACH COPY BUTTON TO CODE BLOCKS
  // ==================================================

  useEffect(() => {
    if (!blog?.content) return;

    const timer = setTimeout(() => {
      const preBlocks = document.querySelectorAll(".prose pre");

      preBlocks.forEach((pre) => {
        if (pre.querySelector(".copy-code-btn")) return;

        pre.style.position = "relative";

        const btn = document.createElement("button");
        btn.className = "copy-code-btn";
        btn.innerText = "Copy";
        btn.setAttribute("type", "button");

        btn.onclick = (e) => {
          e.stopPropagation();
          const codeEl = pre.querySelector("code");
          const textToCopy = codeEl
            ? codeEl.innerText
            : pre.innerText.replace("Copy", "").replace("Copied!", "").trim();

          navigator.clipboard
            .writeText(textToCopy)
            .then(() => {
              btn.innerText = "Copied!";
              setTimeout(() => {
                btn.innerText = "Copy";
              }, 2000);
            })
            .catch(() => {
              btn.innerText = "Failed";
            });
        };

        pre.appendChild(btn);
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [blog, displayedContent]);

  // ==================================================
  // LOADING
  // ==================================================

  if (
    authLoading ||
    loading
  ) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-16 text-white relative overflow-hidden">

        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-[600px] rounded-full bg-indigo-600/10 blur-[120px]" />

        <div className="mx-auto max-w-7xl animate-pulse space-y-8">

          <div className="h-8 w-36 rounded-full bg-white/10" />

          <div className="space-y-4">

            <div className="h-12 w-3/4 rounded-2xl bg-white/10" />

            <div className="flex gap-3">

              <div className="h-8 w-32 rounded-full bg-white/10" />

              <div className="h-8 w-28 rounded-full bg-white/10" />

              <div className="h-8 w-24 rounded-full bg-white/10" />

            </div>

          </div>

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">

            <div className="lg:col-span-8 space-y-6">

              <div className="h-24 rounded-2xl border border-white/10 bg-white/5" />

              <div className="h-96 rounded-3xl border border-white/10 bg-white/5" />

            </div>

            <div className="lg:col-span-4 hidden lg:block">

              <div className="h-80 rounded-3xl border border-white/10 bg-white/5" />

            </div>

          </div>

        </div>

      </div>
    );
  }

  // ==================================================
  // ERROR
  // ==================================================

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-20 text-white relative overflow-hidden flex items-center justify-center">

        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-[600px] rounded-full bg-rose-600/10 blur-[120px]" />

        <div className="mx-auto max-w-lg w-full text-center">

          <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-8 text-rose-200 backdrop-blur-xl shadow-2xl space-y-4">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400">

              <AlertCircle size={28} />

            </div>

            <h2 className="text-xl font-bold text-white">
              Oops! Something went wrong
            </h2>

            <p className="text-sm text-rose-300/90 leading-relaxed">
              {error}
            </p>

            <div className="pt-2">

              <button
                onClick={() =>
                  navigate("/blogs")
                }
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-6 py-3 text-xs font-bold text-white shadow-lg transition-all hover:scale-[1.02]"
              >
                <ArrowLeft size={16} />
                Back to Blogs
              </button>

            </div>

          </div>

        </div>

      </div>
    );
  }

  // ==================================================
  // NO BLOG
  // ==================================================

  if (!blog) {
    return (
      <div className="min-h-screen bg-slate-950 py-28 text-center text-white flex items-center justify-center px-4">

        <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-slate-900/60 p-10 backdrop-blur-xl shadow-2xl">

          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-400">

            <AlertCircle size={32} />

          </div>

          <h2 className="text-2xl font-bold text-white">
            Article not found
          </h2>

          <p className="mt-2 text-xs text-slate-400">
            The requested post might have been removed or renamed.
          </p>

          <button
            onClick={() =>
              navigate("/blogs")
            }
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-all"
          >
            <ArrowLeft size={15} />
            Back to Blogs
          </button>

        </div>

      </div>
    );
  }

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white relative overflow-x-clip font-sans">

      {/* ==================================================
          BACKGROUND
      ================================================== */}

      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-gradient-to-tr from-indigo-600/15 via-purple-600/10 to-pink-600/15 blur-[140px]" />

      <div className="pointer-events-none absolute top-1/3 -left-40 h-[400px] w-[400px] rounded-full bg-indigo-500/10 blur-[130px]" />

      {/* ==================================================
          MAIN CONTAINER
      ================================================== */}

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12 items-start">

          {/* ==================================================
              MAIN CONTENT
          ================================================== */}

          <main className="lg:col-span-8 space-y-8">

            {/* ==================================================
                BACK + SHARE
            ================================================== */}

            <div className="flex items-center justify-between gap-4">

              <button
                onClick={() =>
                  navigate("/blogs")
                }
                className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 backdrop-blur-md transition-all duration-300 hover:border-indigo-500/40 hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft
                  size={15}
                  className="transition-transform group-hover:-translate-x-1 text-indigo-400"
                />

                Back to Blogs
              </button>

              <button
                onClick={handleShare}
                className="group inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-xs font-semibold text-indigo-300 backdrop-blur-md transition-all duration-300 hover:border-indigo-500/60 hover:bg-indigo-500/20 hover:text-white"
              >
                <Share2
                  size={14}
                  className="text-indigo-400"
                />

                Share Post
              </button>

            </div>

            {/* ==================================================
                TITLE
            ================================================== */}

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
              {blog.title}
            </h1>

            {/* ==================================================
                META
            ================================================== */}

            <div className="flex flex-wrap items-center gap-2.5 text-xs font-medium text-slate-300">

              {blog.author && (
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1.5 text-indigo-200">

                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300">

                    <User size={12} />

                  </div>

                  <span>
                    {typeof blog.author ===
                    "object"
                      ? blog.author.name
                      : blog.author}
                  </span>

                </div>
              )}

              {blog.createdAt && (
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-slate-300">

                  <Calendar
                    size={13}
                    className="text-slate-400"
                  />

                  <span>
                    {new Date(
                      blog.createdAt
                    ).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }
                    )}
                  </span>

                </div>
              )}

              {blog.readingTime && (
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-slate-300">

                  <Clock
                    size={13}
                    className="text-slate-400"
                  />

                  <span>
                    {blog.readingTime}
                  </span>

                </div>
              )}

              {categoryName && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3.5 py-1.5 text-purple-300">

                  <Tag size={12} />

                  <span>
                    {categoryName}
                  </span>

                </div>
              )}

            </div>

            {/* ==================================================
                EXCERPT
            ================================================== */}

            {blog.excerpt && (
              <div className="relative overflow-hidden rounded-2xl border-l-4 border-indigo-500 border-y border-r border-white/10 bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-slate-900/40 p-6 sm:p-7 text-base sm:text-lg leading-relaxed text-slate-200 shadow-xl">

                <Quote
                  size={32}
                  className="absolute right-4 bottom-2 text-indigo-500/10"
                />

                <p className="font-medium italic relative z-10">
                  "{blog.excerpt}"
                </p>

              </div>
            )}

            {/* ==================================================
                ARTICLE CONTAINER
            ================================================== */}

            <div className="relative rounded-3xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 md:p-10 shadow-2xl backdrop-blur-xl">

              {/* ARTICLE CONTENT */}
              <div
                className={`relative ${
                  isPreview ? "max-h-[500px] overflow-hidden" : ""
                }`}
              >
                <div
                  className="prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{
                    __html:
                      displayedContent,
                  }}
                />

                {/* Fade Overlay for Guest 1-Screen Preview */}
                {isPreview && (
                  <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-slate-900 via-slate-900/90 to-transparent" />
                )}
              </div>

              {/* ==================================================
                  ANIMATED CENTERED UNLOCK (FOR GUEST USERS)
              ================================================== */}

              {isPreview && (
                <div className="relative mt-8">

                  <div
                    className={`transition-all duration-700 ease-out ${
                      hasScrolledOneScreen
                        ? "opacity-100 translate-y-0 scale-100 shadow-2xl shadow-indigo-500/25 border-indigo-500/50"
                        : "opacity-80 translate-y-4 scale-95 border-indigo-500/30"
                    } relative mx-auto w-full max-w-xl overflow-hidden rounded-3xl border bg-slate-950/95 p-6 sm:p-8 text-center backdrop-blur-2xl`}
                  >

                    <div className="pointer-events-none absolute -left-20 -top-20 h-48 w-48 rounded-full bg-indigo-500/25 blur-3xl animate-pulse" />

                    <div className="pointer-events-none absolute -bottom-20 -right-20 h-48 w-48 rounded-full bg-purple-500/25 blur-3xl animate-pulse" />

                    <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-fuchsia-600 text-white shadow-lg shadow-indigo-500/30">

                      <Lock
                        size={28}
                        className={
                          hasScrolledOneScreen
                            ? "animate-pulse"
                            : ""
                        }
                      />

                    </div>

                    <h2 className="relative text-2xl font-bold tracking-tight text-white">
                      Continue Reading
                    </h2>

                    <p className="relative mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-300">
                      You have reached the end of the free preview. Log in to unlock the full article and source code.
                    </p>

                    <button
                      onClick={
                        handleLogin
                      }
                      className="relative mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-7 py-3.5 font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                    >

                      <LogIn size={18} />

                      Login & Unlock Full Article

                    </button>

                  </div>

                </div>
              )}

            </div>

            {/* ==================================================
                FULL ACCESS BADGE (For Logged-in Users)
            ================================================== */}

            {user && (
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 sm:p-5 text-sm font-semibold text-emerald-300">

                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-slate-950">

                  <Check
                    size={15}
                    className="stroke-[3]"
                  />

                </div>

                <span>
                  Full article unlocked
                </span>

              </div>
            )}

            {/* ==================================================
                COMMENTS
            ================================================== */}

            <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 md:p-10 shadow-2xl backdrop-blur-xl">

              <div className="relative mb-8 flex items-center justify-between">

                <div className="flex items-center gap-3.5 text-white">

                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600">

                    <MessageSquare
                      size={20}
                    />

                  </div>

                  <div>

                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                      Discussion
                    </h2>

                    <p className="text-xs font-medium text-slate-400">
                      Join the conversation
                    </p>

                  </div>

                </div>

                <span className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1 text-xs font-bold text-slate-300">

                  {comments.length}{" "}

                  {comments.length ===
                  1
                    ? "comment"
                    : "comments"}

                </span>

              </div>

              {/* ==================================================
                  COMMENT FORM
              ================================================== */}

              {user ? (
                <form
                  onSubmit={
                    handleComment
                  }
                  className="relative mb-10"
                >

                  <div className="group relative rounded-2xl border border-white/15 bg-slate-950/40 p-1.5">

                    <textarea
                      value={
                        commentText
                      }
                      onChange={(e) =>
                        setCommentText(
                          e.target
                            .value
                        )
                      }
                      placeholder="Share your thoughts on this article..."
                      rows={4}
                      maxLength={
                        2000
                      }
                      disabled={
                        commentLoading
                      }
                      className="w-full resize-none bg-transparent p-4 text-sm text-slate-100 placeholder-slate-400 outline-none"
                    />

                    <div className="flex items-center justify-between border-t border-white/10 bg-slate-900/80 px-4 py-3 rounded-b-xl">

                      <span className="text-xs font-medium text-slate-400">
                        {
                          commentText.length
                        }
                        /2000
                      </span>

                      <button
                        type="submit"
                        disabled={
                          commentLoading ||
                          !commentText.trim()
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                      >

                        <Send size={14} />

                        {commentLoading
                          ? "Posting..."
                          : "Post Comment"}

                      </button>

                    </div>

                  </div>

                </form>
              ) : (
                <div className="relative mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-6">

                  <div>

                    <h3 className="font-semibold text-white text-base">
                      Have something to say?
                    </h3>

                    <p className="mt-0.5 text-xs text-slate-400">
                      Log in to join the conversation and post a comment.
                    </p>

                  </div>

                  <button
                    onClick={
                      handleLogin
                    }
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2.5 text-xs font-bold text-white"
                  >

                    <LogIn size={15} />

                    Login

                  </button>

                </div>
              )}

              {/* ==================================================
                  COMMENT LIST
              ================================================== */}

              <div className="relative space-y-4">

                {comments.length ===
                0 ? (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-10 text-center">

                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">

                      <Sparkles
                        size={24}
                      />

                    </div>

                    <p className="font-semibold text-slate-200 text-sm">
                      No comments yet
                    </p>

                    <p className="text-xs text-slate-400 mt-1">
                      Be the first to share your perspective!
                    </p>

                  </div>
                ) : (
                  comments.map(
                    (
                      comment
                    ) => {
                      const canDelete =
                        canDeleteComment(
                          comment
                        );

                      const isDeleting =
                        String(
                          deletingCommentId
                        ) ===
                        String(
                          comment._id
                        );

                      const authorName =
                        comment.name ||
                        comment
                          .user
                          ?.name ||
                        "User";

                      return (
                        <div
                          key={
                            comment._id
                          }
                          className="group relative rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 shadow-sm backdrop-blur-md"
                        >

                          <div className="flex items-center justify-between gap-4">

                            <div className="flex items-center gap-3">

                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 font-bold text-xs text-white">

                                {authorName
                                  .charAt(
                                    0
                                  )
                                  .toUpperCase()}

                              </div>

                              <div>

                                <p className="font-bold text-xs text-white">
                                  {
                                    authorName
                                  }
                                </p>

                                <p className="text-[11px] font-medium text-slate-400 mt-0.5">

                                  {comment.createdAt
                                    ? new Date(
                                        comment.createdAt
                                      ).toLocaleDateString(
                                        "en-US",
                                        {
                                          year: "numeric",
                                          month: "short",
                                          day: "numeric",
                                        }
                                      )
                                    : ""}

                                </p>

                              </div>

                            </div>

                            {canDelete && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteComment(
                                    comment._id
                                  )
                                }
                                disabled={
                                  isDeleting
                                }
                                title="Delete comment"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-rose-500/20 hover:text-rose-400 disabled:opacity-50"
                              >

                                <Trash2
                                  size={
                                    15
                                  }
                                />

                              </button>
                            )}

                          </div>

                          <p className="mt-3.5 text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">
                            {
                              comment.text
                            }
                          </p>

                        </div>
                      );
                    }
                  )
                )}

              </div>

            </section>

          </main>

          {/* ==================================================
              RELATED ARTICLES
          ================================================== */}

          <aside className="lg:col-span-4 lg:sticky lg:top-20 space-y-6">

            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-xl">

              <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">

                <div className="flex items-center gap-2.5 text-white">

                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">

                    <BookOpen
                      size={18}
                    />

                  </div>

                  <h2 className="text-base font-bold tracking-tight text-white">
                    Related Articles
                  </h2>

                </div>

                {categoryName && (
                  <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[11px] font-semibold text-indigo-300">
                    {
                      categoryName
                    }
                  </span>
                )}

              </div>

              {relatedLoading ? (
                <div className="space-y-3 animate-pulse">

                  {[
                    ...Array(
                      5
                    ),
                  ].map(
                    (_, i) => (
                      <div
                        key={i}
                        className="h-20 rounded-2xl bg-white/5 border border-white/5"
                      />
                    )
                  )}

                </div>
              ) : relatedPosts.length ===
                0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-xs text-slate-400">
                  No related articles found in this category.
                </div>
              ) : (
                <div className="space-y-3">

                  {relatedPosts.map(
                    (item) => (
                      <div
                        key={
                          item._id ||
                          item.slug
                        }
                        onClick={() =>
                          navigate(
                            `/blogs/${
                              item.slug ||
                              item._id
                            }`
                          )
                        }
                        className="group cursor-pointer rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-all duration-300 hover:border-indigo-500/40 hover:bg-white/[0.08]"
                      >

                        <h3 className="line-clamp-2 text-xs sm:text-sm font-bold text-slate-200 group-hover:text-indigo-300 leading-snug">

                          {
                            item.title
                          }

                        </h3>

                        <div className="mt-2.5 flex items-center justify-between text-[11px] font-medium text-slate-400">

                          <span className="flex items-center gap-1.5">

                            <Calendar
                              size={
                                12
                              }
                            />

                            {item.createdAt
                              ? new Date(
                                  item.createdAt
                                ).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                  }
                                )
                              : ""}

                          </span>

                          <span className="flex items-center gap-1 text-indigo-400 font-semibold">

                            Read

                            <ChevronRight
                              size={
                                12
                              }
                            />

                          </span>

                        </div>

                      </div>
                    )
                  )}

                </div>
              )}

            </div>

          </aside>

        </div>

      </div>

      {/* ==================================================
          ALERT MODAL
      ================================================== */}

      {alertModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-md">

          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-slate-900/95 p-6 shadow-2xl">

            <div className="flex items-start gap-4">

              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                  alertModal.type ===
                  "error"
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                }`}
              >

                {alertModal.type ===
                "success" ? (
                  <Check
                    size={24}
                  />
                ) : (
                  <AlertCircle
                    size={24}
                  />
                )}

              </div>

              <div className="flex-1 pt-1">

                <h3 className="text-lg font-bold text-white">
                  {
                    alertModal.title
                  }
                </h3>

                <p className="mt-1 text-xs sm:text-sm leading-relaxed text-slate-300">
                  {
                    alertModal.message
                  }
                </p>

              </div>

              <button
                type="button"
                onClick={
                  closeAlert
                }
                className="rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              >

                <X size={18} />

              </button>

            </div>

            <div className="mt-6 flex justify-end">

              <button
                type="button"
                onClick={
                  closeAlert
                }
                className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-2.5 text-xs font-bold text-white"
              >
                OK
              </button>

            </div>

          </div>

        </div>
      )}

      {/* ==================================================
          DELETE MODAL
      ================================================== */}

      {deleteModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-md">

          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-slate-900/95 p-7 shadow-2xl">

            <div className="flex items-start gap-4">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400">

                <Trash2
                  size={22}
                />

              </div>

              <div className="flex-1 pt-1">

                <h3 className="text-lg font-bold text-white">
                  Delete Comment
                </h3>

                <p className="mt-1 text-xs sm:text-sm leading-relaxed text-slate-300">
                  Are you sure you want to delete this comment? This action cannot be undone.
                </p>

              </div>

              <button
                type="button"
                onClick={
                  closeDeleteModal
                }
                disabled={
                  !!deletingCommentId
                }
                className="rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-50"
              >

                <X size={18} />

              </button>

            </div>

            <div className="mt-8 flex justify-end gap-3">

              <button
                type="button"
                onClick={
                  closeDeleteModal
                }
                disabled={
                  !!deletingCommentId
                }
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  confirmDeleteComment
                }
                disabled={
                  !!deletingCommentId
                }
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50"
              >

                {deletingCommentId ? (
                  "Deleting..."
                ) : (
                  <>
                    <Check
                      size={15}
                    />

                    Delete
                  </>
                )}

              </button>

            </div>

          </div>

        </div>
      )}

      {/* ==================================================
          ARTICLE STYLES
      ================================================== */}

      <style>{`

        /* ==================================================
           GENERAL
        ================================================== */

        .prose {
          max-width: none !important;
          overflow-wrap: break-word !important;
          word-wrap: break-word !important;
        }

        /* ==================================================
           H1
        ================================================== */

        .prose h1 {
          font-size: 2.25rem !important;
          line-height: 1.25 !important;
          font-weight: 800 !important;

          color: #ffffff !important;

          margin-top: 2.5rem !important;
          margin-bottom: 1.25rem !important;

          letter-spacing: -0.025em !important;
        }

        /* ==================================================
           H2
        ================================================== */

        .prose h2 {
          font-size: 1.75rem !important;
          line-height: 1.35 !important;
          font-weight: 700 !important;

          color: #ffffff !important;

          margin-top: 2rem !important;
          margin-bottom: 1rem !important;

          letter-spacing: -0.015em !important;

          border-bottom:
            1px solid
            rgba(255, 255, 255, 0.08) !important;

          padding-bottom: 0.5rem !important;
        }

        /* ==================================================
           H3
        ================================================== */

        .prose h3 {
          font-size: 1.35rem !important;
          line-height: 1.4 !important;
          font-weight: 700 !important;

          color: #f1f5f9 !important;

          margin-top: 1.75rem !important;
          margin-bottom: 0.75rem !important;
        }

        /* ==================================================
           H4 H5 H6
        ================================================== */

        .prose h4,
        .prose h5,
        .prose h6 {
          font-size: 1.1rem !important;
          line-height: 1.4 !important;
          font-weight: 700 !important;

          color: #e2e8f0 !important;

          margin-top: 1.5rem !important;
          margin-bottom: 0.5rem !important;
        }

        /* ==================================================
           PARAGRAPH
        ================================================== */

        .prose p {
          font-size: 1.05rem !important;
          line-height: 1.8 !important;

          color: #cbd5e1 !important;

          margin-top: 1rem !important;
          margin-bottom: 1.25rem !important;

          word-break: break-word !important;
        }

        /* ==================================================
           AUTO DETECTED CODE BLOCKS (PRE) WITH BORDER & BOX
        ================================================== */

        .prose pre {
          position: relative !important;

          display: block !important;

          width: 100% !important;
          max-width: 100% !important;

          margin-top: 2rem !important;
          margin-bottom: 2rem !important;

          padding: 1.25rem 1.4rem !important;

          overflow-x: auto !important;
          overflow-y: hidden !important;

          white-space: pre !important;

          background: #020617 !important;

          border: 1px solid rgba(99, 102, 241, 0.5) !important;

          border-radius: 1rem !important;

          box-shadow:
            0 12px 35px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.05) !important;

          scrollbar-width: thin !important;

          scrollbar-color:
            rgba(99, 102, 241, 0.7)
            rgba(255, 255, 255, 0.05) !important;
        }

        /* COPY CODE BUTTON STYLING */

        .prose pre .copy-code-btn {
          position: absolute !important;
          top: 0.6rem !important;
          right: 0.6rem !important;
          background: rgba(255, 255, 255, 0.1) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          color: #cbd5e1 !important;
          padding: 0.25rem 0.65rem !important;
          font-size: 0.75rem !important;
          font-weight: 600 !important;
          border-radius: 0.5rem !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          z-index: 10 !important;
          user-select: none !important;
        }

        .prose pre .copy-code-btn:hover {
          background: rgba(99, 102, 241, 0.5) !important;
          color: #ffffff !important;
          border-color: rgba(129, 140, 248, 0.7) !important;
        }

        /* ==================================================
           CODE BLOCK SCROLLBAR
        ================================================== */

        .prose pre::-webkit-scrollbar {
          height: 8px !important;
        }

        .prose pre::-webkit-scrollbar-track {
          background:
            rgba(255, 255, 255, 0.04) !important;

          border-radius:
            999px !important;
        }

        .prose pre::-webkit-scrollbar-thumb {
          background:
            rgba(99, 102, 241, 0.7) !important;

          border-radius:
            999px !important;
        }

        .prose pre::-webkit-scrollbar-thumb:hover {
          background:
            rgba(129, 140, 248, 0.9) !important;
        }

        /* ==================================================
           CODE INSIDE PRE
        ================================================== */

        .prose pre code {
          display: block !important;

          width: max-content !important;

          min-width: 100% !important;

          padding: 0 !important;
          margin: 0 !important;

          background:
            transparent !important;

          border: none !important;

          color:
            #e2e8f0 !important;

          font-family:
            ui-monospace,
            SFMono-Regular,
            Menlo,
            Monaco,
            Consolas,
            "Liberation Mono",
            "Courier New",
            monospace !important;

          font-size:
            0.9rem !important;

          line-height:
            1.75 !important;

          white-space:
            pre !important;

          word-break:
            normal !important;

          overflow-wrap:
            normal !important;

          box-shadow:
            none !important;
        }

        /* ==================================================
           INLINE CODE WITH BORDER WRAP
        ================================================== */

        .prose code:not(pre code) {
          display: inline-block !important;

          padding:
            0.2rem 0.5rem !important;

          margin:
            0 0.15rem !important;

          background:
            rgba(15, 23, 42, 0.9) !important;

          border:
            1px solid
            rgba(129, 140, 248, 0.5) !important;

          border-radius:
            0.4rem !important;

          color:
            #c7d2fe !important;

          font-family:
            ui-monospace,
            SFMono-Regular,
            Menlo,
            Monaco,
            Consolas,
            "Liberation Mono",
            "Courier New",
            monospace !important;

          font-size:
            0.875em !important;

          word-break:
            break-word !important;

          box-shadow:
            0 2px 6px
            rgba(0, 0, 0, 0.3) !important;
        }

        /* Remove Tailwind typography backticks */

        .prose code::before,
        .prose code::after {
          content:
            "" !important;
        }

        /* ==================================================
           CODE BLOCK FIRST/LAST
        ================================================== */

        .prose pre:first-child {
          margin-top: 0 !important;
        }

        .prose pre:last-child {
          margin-bottom: 0 !important;
        }

        /* ==================================================
           LISTS
        ================================================== */

        .prose ul {
          list-style-type:
            disc !important;

          padding-left:
            1.75rem !important;

          margin-top:
            1rem !important;

          margin-bottom:
            1rem !important;

          color:
            #cbd5e1 !important;
        }

        .prose ol {
          list-style-type:
            decimal !important;

          padding-left:
            1.75rem !important;

          margin-top:
            1rem !important;

          margin-bottom:
            1rem !important;

          color:
            #cbd5e1 !important;
        }

        .prose li {
          margin-top:
            0.5rem !important;

          margin-bottom:
            0.5rem !important;

          line-height:
            1.7 !important;
        }

        /* ==================================================
           BOLD
        ================================================== */

        .prose strong,
        .prose b {
          font-weight:
            700 !important;

          color:
            #ffffff !important;
        }

        /* ==================================================
           ITALIC
        ================================================== */

        .prose em,
        .prose i {
          font-style:
            italic !important;
        }

        /* ==================================================
           BLOCKQUOTE
        ================================================== */

        .prose blockquote {
          border-left:
            4px solid
            #6366f1 !important;

          background-color:
            rgba(255, 255, 255, 0.05) !important;

          padding:
            0.875rem 1.5rem !important;

          border-top-right-radius:
            0.875rem !important;

          border-bottom-right-radius:
            0.875rem !important;

          margin-top:
            1.5rem !important;

          margin-bottom:
            1.5rem !important;

          font-style:
            italic !important;

          color:
            #e2e8f0 !important;
        }

        /* ==================================================
           LINKS
        ================================================== */

        .prose a {
          color:
            #818cf8 !important;

          text-decoration:
            underline !important;

          font-weight:
            600 !important;
        }

        .prose a:hover {
          color:
            #a5b4fc !important;
        }

        /* ==================================================
           IMAGES
        ================================================== */

        .prose img {
          max-width:
            100% !important;

          height:
            auto !important;

          border-radius:
            1rem !important;

          margin-top:
            1.5rem !important;

          margin-bottom:
            1.5rem !important;

          border:
            1px solid
            rgba(255, 255, 255, 0.1) !important;

          box-shadow:
            0 10px 30px
            rgba(0, 0, 0, 0.25) !important;
        }

        /* ==================================================
           TABLE
        ================================================== */

        .prose table {
          width:
            100% !important;

          border-collapse:
            collapse !important;

          margin-top:
            1.5rem !important;

          margin-bottom:
            1.5rem !important;

          overflow:
            hidden !important;

          border:
            1px solid
            rgba(255, 255, 255, 0.1) !important;

          border-radius:
            0.75rem !important;
        }

        .prose th,
        .prose td {
          border:
            1px solid
            rgba(255, 255, 255, 0.1) !important;

          padding:
            0.75rem 1rem !important;

          color:
            #cbd5e1 !important;
        }

        .prose th {
          color:
            #ffffff !important;

          background:
            rgba(255, 255, 255, 0.05) !important;

          font-weight:
            700 !important;
        }

        /* ==================================================
           MOBILE CODE
        ================================================== */

        @media (max-width: 640px) {

          .prose h1 {
            font-size:
              1.8rem !important;
          }

          .prose h2 {
            font-size:
              1.5rem !important;
          }

          .prose h3 {
            font-size:
              1.2rem !important;
          }

          .prose p {
            font-size:
              1rem !important;

            line-height:
              1.75 !important;
          }

          .prose pre {
            padding:
              1rem !important;

            border-radius:
              0.8rem !important;

            margin-top:
              1.5rem !important;

            margin-bottom:
              1.5rem !important;
          }

          .prose pre code {
            font-size:
              0.82rem !important;

            line-height:
              1.65 !important;
          }
        }

      `}</style>

    </div>
  );
}