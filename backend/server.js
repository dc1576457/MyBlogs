import express from "express";
import "dotenv/config";
import cors from "cors";
import morgan from "morgan";

import { connectDB } from "./database/db.js";
import { logger } from "./utils/logger.js";

import blogRoutes from "./routes/blogRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import toolRoutes from "./routes/toolRoutes.js";
import convertRoutes from "./routes/convertRoutes.js";

const app = express();

/* =========================================================
   1. CORS CONFIGURATION (VERCEL & LOCALHOST SAFE)
========================================================= */
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5174",
  "http://localhost:3001",
  "https://my-blogs-beige.vercel.app",
  "https://my-blogs-beige.vercel.app/",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app")
      ) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Disposition", "Content-Length", "Content-Type"],
  })
);

/* =========================================================
   2. BODY PARSER
========================================================= */
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

/* =========================================================
   3. HTTP REQUEST LOGGER
========================================================= */
app.use(
  morgan(
    ":remote-addr - :method :url :status :res[content-length] - :response-time ms",
    {
      stream: {
        write: (message) => {
          logger.info(message.trim());
        },
      },
    }
  )
);

/* =========================================================
   4. ROUTES
========================================================= */
app.use("/api/blogs", blogRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/tools", toolRoutes);
app.use("/api/convert", convertRoutes);

/* =========================================================
   FRONTEND ERROR LOGGING
========================================================= */
app.post("/api/logs/client", (req, res) => {
  try {
    const { type, message, stack, componentStack, url, userAgent } = req.body;
    logger.error(`CLIENT ERROR: ${type} - ${message} | URL: ${url} | UA: ${userAgent}`);
    return res.status(200).json({ success: true, message: "Logged." });
  } catch (error) {
    return res.status(500).json({ success: false });
  }
});

/* =========================================================
   5. HEALTH CHECK
========================================================= */
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API server is running.",
  });
});

/* =========================================================
   6. 404 HANDLER
========================================================= */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found.",
  });
});

/* =========================================================
   7. ERROR HANDLER
========================================================= */
app.use((err, req, res, next) => {
  logger.error(`SERVER ERROR: ${err.message}\nStack: ${err.stack}`);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error.",
  });
});

/* =========================================================
   8. START SERVER
========================================================= */
const startServer = async () => {
  try {
    await connectDB();
    const PORT = process.env.PORT || 8000;
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
