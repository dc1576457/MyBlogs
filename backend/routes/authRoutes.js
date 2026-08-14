import express from "express";
import {
  signup,
  login,
  getMe,
  logout,
  getAllUsers,
  toggleBlockUser,
  changePassword,
  forgotPassword, 
  resetPassword ,
  deleteUser,
} from "../controllers/userController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);

router.get("/me", protect, getMe);
router.post("/logout", protect, logout);
router.get("/users", protect, adminOnly, getAllUsers);
router.patch("/users/:id/block", protect, adminOnly, toggleBlockUser);
// Change password route
router.put("/change-password", protect, changePassword);
router.post("/forgot-password", forgotPassword);
router.put("/reset-password/:token", resetPassword);
router.delete("/users/:id", protect, adminOnly, deleteUser);
export default router;