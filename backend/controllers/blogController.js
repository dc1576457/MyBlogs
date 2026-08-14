import mongoose from "mongoose";
import * as cheerio from "cheerio";

import Blog from "../models/Blog.js";
import { User } from "../models/User.js";

// ======================================================
// AUTH USER ID
// ======================================================

const getAuthUserId = (req) => {
  return (
    req.user?.userId ||
    req.user?._id ||
    req.user?.id ||
    null
  );
};

// ======================================================
// CHECK OWNER OR ADMIN
// ======================================================

const isOwnerOrAdmin = (
  req,
  blog
) => {
  const userId = getAuthUserId(req);

  if (!userId || !blog) {
    return false;
  }

  if (req.user?.role === "admin") {
    return true;
  }

  return (
    String(blog.author) ===
    String(userId)
  );
};

// ======================================================
// SLUGIFY
// ======================================================

export const slugify = (
  text = ""
) => {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

// ======================================================
// PARSE TAGS
// ======================================================

const parseTags = (tags) => {
  if (Array.isArray(tags)) {
    return tags
      .map((tag) => String(tag).trim())
      .filter(Boolean);
  }

  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
};

// ======================================================
// POPULATE BLOG
// ======================================================

const populateBlog = async (
  blogId
) => {
  return Blog.findById(blogId)
    .populate(
      "author",
      "name email"
    )
    .populate(
      "comments.user",
      "name email"
    );
};

// ======================================================
// SAFE HTML PREVIEW
// ======================================================

const createHtmlPreview = (
  html = "",
  maxCharacters = 1000
) => {
  if (!html) {
    return "";
  }

  try {
    const $ = cheerio.load(
      `<div id="preview-root">${html}</div>`,
      {
        decodeEntities: false,
      }
    );

    const root = $(
      "#preview-root"
    );

    let currentLength = 0;

    const walk = (
      parent
    ) => {
      const nodes = parent.contents().toArray();

      for (const node of nodes) {
        if (currentLength >= maxCharacters) {
          $(node).remove();
          continue;
        }

        if (node.type === "text") {
          const text = node.data || "";

          const remaining =
            maxCharacters -
            currentLength;

          if (text.length > remaining) {
            node.data =
              text.substring(
                0,
                remaining
              ) + "...";

            currentLength =
              maxCharacters;
          } else {
            currentLength +=
              text.length;
          }

          continue;
        }

        if (
          node.type ===
            "tag" ||
          node.type ===
            "script" ||
          node.type ===
            "style"
        ) {
          walk($(node));
        }
      }
    };

    walk(root);

    return root.html() || "";
  } catch (error) {
    console.error(
      "HTML PREVIEW ERROR:",
      error
    );

    // Fallback
    return String(html)
      .replace(/<[^>]*>/g, "")
      .substring(
        0,
        maxCharacters
      );
  }
};

// ======================================================
// CREATE BLOG
// ======================================================

export const createBlog = async (
  req,
  res
) => {
  try {
    const {
      title,
      slug,
      excerpt,
      content,
      coverImage,
      category,
      tags,
      status,
      commentsEnabled,
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "Blog title is required",
      });
    }

    if (!content?.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "Blog content is required",
      });
    }

    const author =
      getAuthUserId(req);

    if (!author) {
      return res.status(401).json({
        success: false,
        message:
          "Author authentication is required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        author
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid author ID",
      });
    }

    const finalSlug =
      slugify(slug || title);

    if (!finalSlug) {
      return res.status(400).json({
        success: false,
        message:
          "A valid slug could not be generated",
      });
    }

    const existingBlog =
      await Blog.findOne({
        slug: finalSlug,
      });

    if (existingBlog) {
      return res.status(409).json({
        success: false,
        message:
          "This slug already exists",
      });
    }

    const blog =
      await Blog.create({
        title: title.trim(),

        slug: finalSlug,

        excerpt:
          excerpt?.trim() || "",

        content:
          content.trim(),

        coverImage:
          coverImage?.trim() || "",

        author,

        category:
          category?.trim() ||
          "General",

        tags: parseTags(tags),

        status:
          status === "published"
            ? "published"
            : "draft",

        commentsEnabled:
          commentsEnabled !==
          undefined
            ? Boolean(
                commentsEnabled
              )
            : true,

        comments: [],
      });

    const populatedBlog =
      await populateBlog(
        blog._id
      );

    return res.status(201).json({
      success: true,
      message:
        "Blog created successfully",
      blog: populatedBlog,
    });
  } catch (error) {
    console.error(
      "CREATE BLOG ERROR:",
      error
    );

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Blog slug already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to create blog",
      error: error.message,
    });
  }
};

// ======================================================
// GET ALL BLOGS
// ======================================================

export const getAllBlogs = async (
  req,
  res
) => {
  try {
    let page =
      parseInt(
        req.query.page,
        10
      ) || 1;

    if (page < 1) {
      page = 1;
    }

    const limit = Math.min(
      parseInt(
        req.query.limit,
        10
      ) || 6,
      50
    );

    const skip =
      (page - 1) *
      limit;

    const {
      search,
      status,
      category,
    } = req.query;

    const query = {};

    if (
      status &&
      status !== "all"
    ) {
      query.status = status;
    } else {
      query.status =
        "published";
    }

    if (
      search &&
      search.trim()
    ) {
      query.$or = [
        {
          title: {
            $regex:
              search.trim(),
            $options: "i",
          },
        },
        {
          excerpt: {
            $regex:
              search.trim(),
            $options: "i",
          },
        },
        {
          category: {
            $regex:
              search.trim(),
            $options: "i",
          },
        },
      ];
    }

    if (
      category &&
      category.trim()
    ) {
      query.category =
        category.trim();
    }

    const totalBlogs =
      await Blog.countDocuments(
        query
      );

    const blogs =
      await Blog.find(query)
        .populate(
          "author",
          "name email"
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean();

    const totalPages =
      Math.ceil(
        totalBlogs / limit
      );

    return res.status(200).json({
      success: true,

      pagination: {
        currentPage: page,
        limit,
        totalBlogs,
        totalPages,
        hasNextPage:
          page <
          totalPages,
        hasPreviousPage:
          page > 1,
      },

      blogs,
    });
  } catch (error) {
    console.error(
      "GET ALL BLOGS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch blogs",
      error: error.message,
    });
  }
};

// ======================================================
// GET BLOG BY ID
// ======================================================

export const getBlogById = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid blog ID",
      });
    }

    const blog =
      await Blog.findById(id)
        .populate(
          "author",
          "name email"
        )
        .populate(
          "comments.user",
          "name email"
        );

    if (!blog) {
      return res.status(404).json({
        success: false,
        message:
          "Blog not found",
      });
    }

    if (
      blog.status ===
      "published"
    ) {
      return res.status(200).json({
        success: true,
        access: "full",
        authenticated:
          Boolean(req.user),
        blog,
      });
    }

    if (!req.user) {
      return res.status(404).json({
        success: false,
        message:
          "Blog not found",
      });
    }

    if (
      !isOwnerOrAdmin(
        req,
        blog
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to view this draft",
      });
    }

    return res.status(200).json({
      success: true,
      access: "draft",
      authenticated: true,
      blog,
    });
  } catch (error) {
    console.error(
      "GET BLOG BY ID ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch blog",
      error: error.message,
    });
  }
};

// ======================================================
// GET BLOG BY SLUG
// ======================================================

export const getBlogBySlug = async (
  req,
  res
) => {
  try {
    const { slug } =
      req.params;

    if (!slug?.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "Blog slug is required",
      });
    }

    const normalizedSlug =
      slug
        .trim()
        .toLowerCase();

    const blog =
      await Blog.findOne({
        slug: normalizedSlug,
        status: "published",
      })
        .populate(
          "author",
          "name email"
        )
        .populate(
          "comments.user",
          "name email"
        )
        .lean();

    if (!blog) {
      return res.status(404).json({
        success: false,
        message:
          "Blog not found",
      });
    }

    const fullContent =
      blog.content || "";

    // ==================================================
    // LOGGED-IN USER
    // ==================================================

    if (req.user) {
      await Blog.findByIdAndUpdate(
        blog._id,
        {
          $inc: {
            views: 1,
          },
        }
      );

      return res.status(200).json({
        success: true,
        access: "full",
        authenticated: true,
        requiresLogin: false,

        blog: {
          ...blog,
          content:
            fullContent,
        },
      });
    }

    // ==================================================
    // GUEST PREVIEW
    // ==================================================

    const previewPercentage = 35;

    let previewLength =
      Math.floor(
        fullContent.length *
          (previewPercentage /
            100)
      );

    previewLength =
      Math.max(
        previewLength,
        800
      );

    previewLength =
      Math.min(
        previewLength,
        fullContent.length
      );

    const previewContent =
      createHtmlPreview(
        fullContent,
        previewLength
      );

    await Blog.findByIdAndUpdate(
      blog._id,
      {
        $inc: {
          views: 1,
        },
      }
    );

    return res.status(200).json({
      success: true,

      access: "preview",

      authenticated: false,

      requiresLogin: true,

      previewPercentage,

      blog: {
        ...blog,

        // IMPORTANT:
        // Actual article content preview
        content:
          previewContent,
      },
    });
  } catch (error) {
    console.error(
      "GET BLOG BY SLUG ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch blog",
      error: error.message,
    });
  }
};

// ======================================================
// GET FULL BLOG
// ======================================================

export const getFullBlog = async (
  req,
  res
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Please login to read the full article",
        code: "LOGIN_REQUIRED",
      });
    }

    const { slug } =
      req.params;

    const blog =
      await Blog.findOne({
        slug:
          slug
            .trim()
            .toLowerCase(),

        status: "published",
      })
        .populate(
          "author",
          "name email"
        )
        .populate(
          "comments.user",
          "name email"
        );

    if (!blog) {
      return res.status(404).json({
        success: false,
        message:
          "Blog not found",
      });
    }

    return res.status(200).json({
      success: true,
      access: "full",
      authenticated: true,
      requiresLogin: false,
      blog,
    });
  } catch (error) {
    console.error(
      "GET FULL BLOG ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch full blog",
      error: error.message,
    });
  }
};

// ======================================================
// UPDATE BLOG
// ======================================================

export const updateBlog = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid blog ID",
      });
    }

    const blog =
      await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message:
          "Blog not found",
      });
    }

    if (
      !isOwnerOrAdmin(
        req,
        blog
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You can update only your own blog",
      });
    }

    const {
      title,
      slug,
      excerpt,
      content,
      coverImage,
      category,
      tags,
      status,
      commentsEnabled,
    } = req.body;

    if (
      title !== undefined
    ) {
      if (!String(title).trim()) {
        return res.status(400).json({
          success: false,
          message:
            "Title cannot be empty",
        });
      }

      blog.title =
        String(title).trim();
    }

    if (
      slug !== undefined
    ) {
      const newSlug =
        slugify(slug);

      if (!newSlug) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid slug",
        });
      }

      if (
        newSlug !==
        blog.slug
      ) {
        const slugExists =
          await Blog.findOne({
            slug: newSlug,
            _id: {
              $ne: id,
            },
          });

        if (slugExists) {
          return res.status(409).json({
            success: false,
            message:
              "Slug already exists",
          });
        }

        blog.slug =
          newSlug;
      }
    }

    if (
      excerpt !== undefined
    ) {
      blog.excerpt =
        String(
          excerpt || ""
        ).trim();
    }

    if (
      content !== undefined
    ) {
      if (
        !String(
          content
        ).trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Content cannot be empty",
        });
      }

      blog.content =
        String(
          content
        ).trim();
    }

    if (
      coverImage !== undefined
    ) {
      blog.coverImage =
        String(
          coverImage || ""
        ).trim();
    }

    if (
      category !== undefined
    ) {
      blog.category =
        String(
          category || ""
        ).trim() ||
        "General";
    }

    if (
      tags !== undefined
    ) {
      blog.tags =
        parseTags(tags);
    }

    if (
      status !== undefined
    ) {
      if (
        ![
          "draft",
          "published",
        ].includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid blog status",
        });
      }

      blog.status =
        status;
    }

    if (
      commentsEnabled !==
      undefined
    ) {
      blog.commentsEnabled =
        Boolean(
          commentsEnabled
        );
    }

    await blog.save();

    const updatedBlog =
      await populateBlog(
        blog._id
      );

    return res.status(200).json({
      success: true,
      message:
        "Blog updated successfully",
      blog: updatedBlog,
    });
  } catch (error) {
    console.error(
      "UPDATE BLOG ERROR:",
      error
    );

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Slug already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to update blog",
      error: error.message,
    });
  }
};

// ======================================================
// DELETE BLOG
// ======================================================

export const deleteBlog = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid blog ID",
      });
    }

    const blog =
      await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message:
          "Blog not found",
      });
    }

    if (
      !isOwnerOrAdmin(
        req,
        blog
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You can delete only your own blog",
      });
    }

    await Blog.findByIdAndDelete(
      id
    );

    return res.status(200).json({
      success: true,
      message:
        "Blog deleted successfully",
    });
  } catch (error) {
    console.error(
      "DELETE BLOG ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete blog",
      error: error.message,
    });
  }
};

// ======================================================
// ADD COMMENT
// ======================================================

export const addComment = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid blog ID",
      });
    }

    // ==================================================
    // AUTH
    // ==================================================

    const authUserId =
      getAuthUserId(req);

    if (!authUserId) {
      return res.status(401).json({
        success: false,
        message:
          "Please login to comment",
        code: "LOGIN_REQUIRED",
      });
    }

    // ==================================================
    // TEXT
    // ==================================================

    const cleanText =
      String(
        req.body?.text || ""
      ).trim();

    if (!cleanText) {
      return res.status(400).json({
        success: false,
        message:
          "Comment text is required",
      });
    }

    if (
      cleanText.length >
      2000
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Comment cannot exceed 2000 characters",
      });
    }

    // ==================================================
    // BLOG
    // ==================================================

    const blog =
      await Blog.findOne({
        _id: id,
        status: "published",
      });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message:
          "Published blog not found",
      });
    }

    // ==================================================
    // COMMENTS ENABLED
    // ==================================================

    if (
      blog.commentsEnabled ===
      false
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Comments are disabled for this blog",
      });
    }

    // ==================================================
    // USER
    // ==================================================

    const user =
      await User.findById(
        authUserId
      ).select(
        "_id name email"
      );

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Authenticated user not found",
      });
    }

    // ==================================================
    // CREATE COMMENT
    // ==================================================

    blog.comments.unshift({
      user: user._id,
      name:
        user.name || "User",
      text: cleanText,
    });

    await blog.save();

    // ==================================================
    // GET SAVED COMMENT
    // ==================================================

    const savedComment =
      blog.comments[0];

    return res.status(201).json({
      success: true,
      message:
        "Comment posted successfully",

      comment: {
        _id:
          savedComment._id,

        user:
          savedComment.user,

        name:
          savedComment.name,

        text:
          savedComment.text,

        createdAt:
          savedComment.createdAt,
      },
    });
  } catch (error) {
    console.error(
      "ADD COMMENT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to post comment",
      error: error.message,
    });
  }
};

// ======================================================
// DELETE COMMENT
// ======================================================

export const deleteComment = async (
  req,
  res
) => {
  try {
    const {
      blogId,
      commentId,
    } = req.params;

    // ==================================================
    // AUTH
    // ==================================================

    const authUserId =
      getAuthUserId(req);

    if (!authUserId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
        code: "LOGIN_REQUIRED",
      });
    }

    // ==================================================
    // IDS
    // ==================================================

    if (
      !mongoose.Types.ObjectId.isValid(
        blogId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid blog ID",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        commentId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid comment ID",
      });
    }

    // ==================================================
    // BLOG
    // ==================================================

    const blog =
      await Blog.findById(
        blogId
      );

    if (!blog) {
      return res.status(404).json({
        success: false,
        message:
          "Blog not found",
      });
    }

    // ==================================================
    // COMMENT
    // ==================================================

    const comment =
      blog.comments.id(
        commentId
      );

    if (!comment) {
      return res.status(404).json({
        success: false,
        message:
          "Comment not found",
      });
    }

    // ==================================================
    // COMMENT OWNER ID
    // ==================================================

    const commentOwnerId =
      comment.user
        ? String(
            comment.user
          )
        : null;

    const loggedInUserId =
      String(
        authUserId
      );

    const isAdmin =
      req.user?.role ===
      "admin";

    // ==================================================
    // OWNER / ADMIN
    // ==================================================

    if (
      !isAdmin &&
      (
        !commentOwnerId ||
        commentOwnerId !==
          loggedInUserId
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You can delete only your own comment.",
      });
    }

    // ==================================================
    // DELETE
    // ==================================================

    blog.comments.pull(
      commentId
    );

    await blog.save();

    return res.status(200).json({
      success: true,
      message:
        "Comment deleted successfully",
      commentId,
    });
  } catch (error) {
    console.error(
      "DELETE COMMENT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete comment",
      error: error.message,
    });
  }
};