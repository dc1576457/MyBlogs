import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { User } from "../models/User.js";

dotenv.config();

const createAdmin = async () => {
  try {
    if (!process.env.MONGO_URL) {
      throw new Error("MONGO_URL is not defined in .env");
    }

    await mongoose.connect(process.env.MONGO_URL,{dbName: "demon"});

    console.log("MongoDB connected");

    const email = "kumarkamaljeet119@gmail.com";
    const password = process.env.ADMIN_PASSWORD;

    if (!password) {
      throw new Error("ADMIN_PASSWORD is not defined in .env");
    }

    const existingUser = await User.findOne({ email });

    const hashedPassword = await bcrypt.hash(password, 12);

    if (existingUser) {
      existingUser.role = "admin";
      existingUser.password = hashedPassword;

      await existingUser.save();

      console.log("Existing user promoted to admin");
    } else {
      const admin = await User.create({
        name: "Admin",
        email,
        password: hashedPassword,
        role: "admin",
      });

      console.log("Admin created:", admin.email);
    }

    await mongoose.disconnect();

    console.log("MongoDB disconnected");
  } catch (error) {
    console.error("Admin creation error:", error);
    process.exit(1);
  }
};

createAdmin();