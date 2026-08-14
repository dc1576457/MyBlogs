import express from "express";

import {
  createBlog,
  getAllBlogs,
  getBlogById,
  getBlogBySlug,
  getFullBlog,
  updateBlog,
  deleteBlog,
  addComment,
  deleteComment,
} from "../controllers/blogController.js";

import {
  protect,
  optionalAuth,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// ======================================================
// PUBLIC BLOG LIST
// ======================================================

router.get(
  "/",
  getAllBlogs
);

// ======================================================
// BLOG BY SLUG
//
// Guest      => preview
// Logged in  => full
// ======================================================

router.get(
  "/slug/:slug",
  optionalAuth,
  getBlogBySlug
);

// ======================================================
// FULL BLOG
// ======================================================

router.get(
  "/full/:slug",
  protect,
  getFullBlog
);

// ======================================================
// BLOG BY ID
// ======================================================

router.get(
  "/:id",
  optionalAuth,
  getBlogById
);

// ======================================================
// CREATE BLOG
// ======================================================

router.post(
  "/",
  protect,
  createBlog
);

// ======================================================
// UPDATE BLOG
// ======================================================

router.put(
  "/:id",
  protect,
  updateBlog
);

// ======================================================
// DELETE BLOG
// ======================================================

router.delete(
  "/:id",
  protect,
  deleteBlog
);

// ======================================================
// ADD COMMENT
// ======================================================

router.post(
  "/:id/comments",
  protect,
  addComment
);

// ======================================================
// DELETE COMMENT
// ======================================================

router.delete(
  "/:blogId/comments/:commentId",
  protect,
  deleteComment
);

export default router;