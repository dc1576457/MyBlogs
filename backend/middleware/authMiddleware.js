import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

// ======================================================
// GET TOKEN FROM HEADER
// ======================================================

const getTokenFromHeader = (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7).trim();

  return token || null;
};

// ======================================================
// BUILD USER OBJECT
// ======================================================

const buildUserObject = (user) => {
  return {
    _id: user._id,
    id: user._id,
    userId: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isBlocked: Boolean(user.isBlocked),
  };
};

// ======================================================
// REQUIRED AUTH
// ======================================================

export const protect = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        code: "NO_TOKEN",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing");

      return res.status(500).json({
        success: false,
        message: "Authentication configuration error",
        code: "AUTH_CONFIG_ERROR",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const decodedUserId =
      decoded?.userId || decoded?._id || decoded?.id;

    if (!decodedUserId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
        code: "INVALID_TOKEN",
      });
    }

    const user = await User.findById(decodedUserId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
        code: "USER_NOT_FOUND",
      });
    }

    // CHECK IF USER IS BLOCKED
    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked. Please contact support.",
        code: "ACCOUNT_BLOCKED",
      });
    }

    // CHECK SESSION TOKEN
    if (!user.token) {
      return res.status(401).json({
        success: false,
        message: "Session is no longer active. Please login again.",
        code: "SESSION_INVALID",
      });
    }

    if (String(user.token) !== String(token)) {
      return res.status(401).json({
        success: false,
        message: "Session is invalid. Please login again.",
        code: "SESSION_INVALID",
      });
    }

    req.user = buildUserObject(user);

    return next();
  } catch (error) {
    console.error("AUTH MIDDLEWARE ERROR:", error);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
        code: "TOKEN_EXPIRED",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
        code: "INVALID_TOKEN",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Authentication failed",
      code: "AUTH_FAILED",
    });
  }
};

// ======================================================
// OPTIONAL AUTH
// ======================================================

export const optionalAuth = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);

    if (!token || !process.env.JWT_SECRET) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const decodedUserId =
      decoded?.userId || decoded?._id || decoded?.id;

    if (!decodedUserId) {
      req.user = null;
      return next();
    }

    const user = await User.findById(decodedUserId);

    if (!user || user.isBlocked) {
      req.user = null;
      return next();
    }

    if (!user.token || String(user.token) !== String(token)) {
      req.user = null;
      return next();
    }

    req.user = buildUserObject(user);

    return next();
  } catch (error) {
    req.user = null;
    return next();
  }
};

// ======================================================
// ADMIN ONLY
// ======================================================

export const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
      code: "NO_AUTH",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
      code: "ADMIN_REQUIRED",
    });
  }

  return next();
};