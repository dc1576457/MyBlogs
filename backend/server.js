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

const PORT = process.env.PORT || 8000;

/* =========================================================
   CORS CONFIGURATION
========================================================= */

app.use(
  cors({
    origin: true, // Allow all verified incoming origins dynamically
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "Origin",
      "X-Requested-With",
    ],
    exposedHeaders: ["Content-Disposition", "Content-Length", "Content-Type"],
  })
);

/* =========================================================
   BODY PARSER
========================================================= */

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

/* =========================================================
   LOGGING (MORGAN)
========================================================= */

app.use(
  morgan(
    ":remote-addr - :method :url :status :res[content-length] - :response-time ms",
    {
      stream: {
        write: (message) => {
          logger?.info?.(message.trim());
        },
      },
    }
  )
);

/* =========================================================
   HEALTH CHECKS
========================================================= */

app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "API server is running.",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Server is healthy.",
    timestamp: new Date().toISOString(),
  });
});

/* =========================================================
   API ROUTES (Mounted with & without /api to prevent 404/405)
========================================================= */

app.use("/api/blogs", blogRoutes);
app.use("/blogs", blogRoutes);

app.use("/api/auth", authRoutes);
app.use("/auth", authRoutes);

app.use("/api/tools", toolRoutes);
app.use("/tools", toolRoutes);

app.use("/api/convert", convertRoutes);
app.use("/convert", convertRoutes);

/* =========================================================
   FRONTEND ERROR LOGGER
========================================================= */

app.post("/api/logs/client", (req, res) => {
  try {
    const { type, message, stack, url, userAgent } = req.body || {};
    logger?.error?.(`
CLIENT ERROR: [${type || "REACT_ERROR"}]
URL: ${url || "Unknown"}
Message: ${message || "Unknown"}
User Agent: ${userAgent || "N/A"}
Stack: ${stack || "N/A"}
    `);
    return res.status(200).json({ success: true });
  } catch {
    return res.status(500).json({ success: false });
  }
});

/* =========================================================
   404 HANDLER
========================================================= */

app.use((req, res) => {
  logger?.warn?.(`404: ${req.method} ${req.originalUrl}`);
  return res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

app.use((err, req, res, next) => {
  logger?.error?.(`SERVER ERROR: ${err?.message || err}\n${err?.stack || ""}`);

  if (res.headersSent) {
    return next(err);
  }

  return res.status(err?.status || 500).json({
    success: false,
    message: err?.message || "Internal server error.",
  });
});

/* =========================================================
   START SERVER
========================================================= */

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      logger?.info?.(`Server running on port ${PORT}`);
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger?.error?.(`Server failed to start: ${error.message}`);
    process.exit(1);
  }
};

startServer();

export default app;
