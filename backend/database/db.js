import mongoose from "mongoose";
import "dotenv/config";

export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL, {
            dbName: "demon",
        });

        console.log("Database Connected Successfully!");
    } catch (error) {
        console.error("Database connection failed:", error.message);
        process.exit(1);
    }
};