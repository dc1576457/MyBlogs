import Blog  from "../models/Blog"
import Comment  from "../models/Comment"

/*
==================================================
CREATE COMMENT
==================================================
*/

export const createComment = async (req, res) => {
  try {
    /*
    auth middleware se user aayega
    */

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Please login to comment.",
      });
    }

    const { blogId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment text is required.",
      });
    }

    if (text.trim().length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Comment cannot exceed 2000 characters.",
      });
    }

    /*
    Find blog
    */

    const blog = await Blog.findById(blogId);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found.",
      });
    }

    /*
    Get actual logged-in user ID.
    Different JWT payloads may use:
    _id / id / userId
    */

    const userId =
      req.user._id ||
      req.user.id ||
      req.user.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication user.",
      });
    }

    /*
    User name
    */

    const userName =
      req.user.name ||
      req.user.username ||
      "User";

    /*
    Create comment
    */

    const comment = await Comment.create({
      user: userId,
      name: userName,
      text: text.trim(),
    });

    /*
    Add comment to blog
    */

    blog.comments = blog.comments || [];

    blog.comments.unshift(comment._id);

    await blog.save();

    /*
    Return populated comment
    */

    const populatedComment =
      await Comment.findById(comment._id)
        .populate("user", "name email");

    return res.status(201).json({
      success: true,
      message: "Comment posted successfully.",
      comment: populatedComment,
    });
  } catch (error) {
    console.error("CREATE COMMENT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to post comment.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

/*
==================================================
DELETE COMMENT
==================================================
*/

export const deleteComment = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Please login.",
      });
    }

    const { blogId, commentId } = req.params;

    const userId =
      req.user._id ||
      req.user.id ||
      req.user.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication user.",
      });
    }

    /*
    Find comment
    */

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found.",
      });
    }

    /*
    OWNER CHECK
    */

    if (
      String(comment.user) !==
      String(userId)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You can delete only your own comment.",
      });
    }

    /*
    Delete comment
    */

    await Comment.findByIdAndDelete(commentId);

    /*
    Remove comment ID from blog
    */

    await Blog.findByIdAndUpdate(
      blogId,
      {
        $pull: {
          comments: commentId,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE COMMENT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete comment.",
    });
  }
};