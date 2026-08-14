import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import crypto from "crypto";
import nodemailer from "nodemailer";

// ======================================================
// GENERATE JWT (30 DAYS / 1 MONTH EXPIRY)
// ======================================================

const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "30d", // 1 Month Token Expiry
    }
  );
};

// Cookie options for 1 Month (30 Days)
const COOKIE_OPTIONS = {
  expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 Days
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
};

// ======================================================
// SAFE USER
// ======================================================

const getSafeUser = (user) => {
  return {
    _id: user._id,
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
};

// ======================================================
// SIGNUP
// ======================================================

export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered. Please login.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "user",
      token: null,
    });

    // ==========================================
    // CREATE TOKEN & SET COOKIE
    // ==========================================

    const token = generateToken(user);
    user.token = token;
    await user.save();

    // Set 1 Month Cookie
    res.cookie("token", token, COOKIE_OPTIONS);

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      user: getSafeUser(user),
    });
  } catch (error) {
    console.error("SIGNUP ERROR:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email already registered. Please login.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ======================================================
// LOGIN
// ======================================================

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // ==========================================
    // CHECK IF USER IS BLOCKED / SUSPENDED
    // ==========================================
    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended. Please contact support.",
        code: "ACCOUNT_BLOCKED",
        isBlocked: true,
      });
    }

    const role = user.role === "admin" ? "admin" : "user";

    const token = generateToken({
      _id: user._id,
      role,
    });

    // ==========================================
    // SAVE CURRENT TOKEN & SET 1 MONTH COOKIE
    // ==========================================

    user.token = token;
    await user.save();

    // Set 1 Month Cookie
    res.cookie("token", token, COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: getSafeUser(user),
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ======================================================
// GET CURRENT USER
// ======================================================

export const getMe = async (req, res) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const user = await User.findById(req.user.userId).select("-password -token");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("GET ME ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ======================================================
// LOGOUT
// ======================================================

export const logout = async (req, res) => {
  try {
    if (req.user?.userId) {
      await User.findByIdAndUpdate(req.user.userId, {
        $set: {
          token: null,
        },
      });
    }

    // Clear Cookie
    res.clearCookie("token");

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("LOGOUT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ======================================================
// @desc    Get all users
// @route   GET /api/auth/users
// @access  Protected / Admin
// ======================================================
export const getAllUsers = async (req, res) => {
  try {
    // Fetch users excluding sensitive fields like password
    const users = await User.find({}).select("-password").sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Get All Users Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve users",
    });
  }
};

// ======================================================
// @desc    Toggle block/unblock user
// @route   PATCH /api/auth/users/:id/block
// @access  Protected / Admin
// ======================================================
export const toggleBlockUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.role === "admin") {
      return res.status(400).json({
        success: false,
        message: "Admin users cannot be blocked",
      });
    }

    user.isBlocked = !user.isBlocked;

    if (user.isBlocked) {
      user.token = null;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: `User ${user.isBlocked ? "blocked" : "unblocked"} successfully`,
      isBlocked: user.isBlocked,
    });
  } catch (error) {
    console.error("Toggle Block Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update block status",
    });
  }
};

// ======================================================
// @desc    Change logged-in user's password
// @route   PUT /api/auth/change-password
// @access  Protected
// ======================================================
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters.",
      });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Incorrect current password.",
      });
    }

    // Hash and update new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("CHANGE PASSWORD ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update password.",
    });
  }
};

// ======================================================
// HELPER: SEND RESET EMAIL
// ======================================================
const sendEmail = async (options) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("EMAIL_USER or EMAIL_PASS is missing in your .env file");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS.replace(/\s+/g, ""), // Remove spaces if present
    },
  });

  const mailOptions = {
    from: `"Blog Support" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  await transporter.sendMail(mailOptions);
};

// ======================================================
// @desc    Forgot Password - Send Reset Link to Email
// @route   POST /api/auth/forgot-password
// @access  Public
// ======================================================
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide an email address.",
      });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with that email address.",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account is suspended. Contact support.",
      });
    }

    // Generate random reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Hash token and save to database (Expires in 15 mins)
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 Minutes
    await user.save();

    // Reset Link URL
<<<<<<< HEAD
    const resetUrl = `${process.env.FRONTEND_URL || "https://my-blogs-beige.vercel.app/"}/reset-password/${resetToken}`;
=======
    const resetUrl = `${process.env.FRONTEND_URL || "https://my-blogs-beige.vercel.app"}/reset-password/${resetToken}`;
>>>>>>> 1ba9c1d (Fix deployment and React routing)

    const messageHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0f172a; color: #ffffff; border-radius: 12px;">
        <h2 style="color: #f97316;">Password Reset Request</h2>
        <p style="color: #cbd5e1;">You requested a password reset for your account. Click the button below to reset your password. This link is valid for 15 minutes.</p>
        <div style="margin: 25px 0;">
          <a href="${resetUrl}" style="background-color: #f97316; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #64748b; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: "Password Reset Request",
        html: messageHtml,
      });

      return res.status(200).json({
        success: true,
        message: "Password reset link sent to your email.",
      });
    } catch (mailError) {
      console.error("Nodemailer Mail Error:", mailError);
      console.log("👉 Development Reset URL:", resetUrl);

      return res.status(200).json({
        success: true,
        message: "Password reset link generated. (Check server console if email failed)",
        resetUrl,
      });
    }
  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error.",
    });
  }
};

// ======================================================
// @desc    Reset Password using Token
// @route   PUT /api/auth/reset-password/:token
// @access  Public
// ======================================================
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    // Hash token to compare with DB
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token.",
      });
    }

    // Set new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;
    user.token = null; // Invalidate current session

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successful. You can now log in.",
    });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error.",
    });
  }
};

// ======================================================
// @desc    Delete user account
// @route   DELETE /api/auth/users/:id
// @access  Protected / Admin
// ======================================================
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Protect admin accounts from being deleted
    if (user.role === "admin") {
      return res.status(400).json({
        success: false,
        message: "Admin users cannot be deleted.",
      });
    }

    await User.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "User account deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE USER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete user.",
    });
  }
};
