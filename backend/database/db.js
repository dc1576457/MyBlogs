import mongoose from "mongoose";
import "dotenv/config";

export const connectDB = async () => {
  try {
    const mongoUrl = process.env.MONGO_URL || process.env.MONGO_URI;

    if (!mongoUrl) {
      throw new Error("MONGO_URL is not defined in environment variables!");
    }

    const conn = await mongoose.connect(mongoUrl, {
      dbName: "demon",
    });

    console.log(`Database Connected Successfully: ${conn.connection.host} (DB: ${conn.connection.name})`);
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};
