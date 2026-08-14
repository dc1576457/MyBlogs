import mongoose from "mongoose";

// ======================================================
// COMMENT SCHEMA
// ======================================================

const commentSchema = new mongoose.Schema(
  {
    // Real logged-in user ID
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // User name snapshot
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    // Comment text
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
  }
);

// ======================================================
// BLOG SCHEMA
// ======================================================

const blogSchema = new mongoose.Schema(
  {
    // ==========================================
    // TITLE
    // ==========================================

    title: {
      type: String,
      required: [true, "Blog title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [200, "Title cannot exceed 200 characters"],
    },

    // ==========================================
    // SLUG
    // ==========================================

    slug: {
      type: String,
      required: [true, "Blog slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    // ==========================================
    // EXCERPT
    // ==========================================

    excerpt: {
      type: String,
      trim: true,
      maxlength: [500, "Excerpt cannot exceed 500 characters"],
      default: "",
    },

    // ==========================================
    // FULL CONTENT
    // ==========================================

    content: {
      type: String,
      required: [true, "Blog content is required"],
      trim: true,
    },

    // ==========================================
    // COVER IMAGE
    // ==========================================

    coverImage: {
      type: String,
      default: "",
      trim: true,
    },

    // ==========================================
    // AUTHOR
    // ==========================================

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ==========================================
    // CATEGORY
    // ==========================================

    category: {
      type: String,
      trim: true,
      default: "General",
      index: true,
    },

    // ==========================================
    // TAGS
    // ==========================================

    tags: {
      type: [String],
      default: [],
    },

    // ==========================================
    // STATUS
    // ==========================================

    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
      index: true,
    },

    // ==========================================
    // VIEWS
    // ==========================================

    views: {
      type: Number,
      default: 0,
      min: [0, "Views cannot be negative"],
    },

    // ==========================================
    // COMMENTS ENABLED
    // ==========================================

    commentsEnabled: {
      type: Boolean,
      default: true,
    },

    // ==========================================
    // COMMENTS
    // ==========================================

    comments: {
      type: [commentSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// ======================================================
// INDEXES
// ======================================================

blogSchema.index({
  status: 1,
  createdAt: -1,
});

blogSchema.index({
  author: 1,
  createdAt: -1,
});

blogSchema.index({
  category: 1,
  createdAt: -1,
});

const Blog = mongoose.model("Blog", blogSchema);

export default Blog;