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
   1. CORS (PATCH method added here)
========================================================= */
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:5174",
      "http://localhost:3001",
    ],
    credentials: true,
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

/* =========================================================
   2. BODY PARSER
========================================================= */
app.use(
  express.json({
    limit: "50mb",
  })
);

app.use(
  express.urlencoded({
    limit: "50mb",
    extended: true,
  })
);

/* =========================================================
   3. HTTP REQUEST LOGGER (Morgan -> Winston)
========================================================= */
app.use(
  morgan(
    ":remote-addr - :method :url :status :res[content-length] - :response-time ms",
    {
      stream: {
        write: (message) => {
          logger.info(
            message.trim()
          );
        },
      },
    }
  )
);

/* =========================================================
   4. ROUTES
========================================================= */
app.use(
  "/api/blogs",
  blogRoutes
);

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/tools",
  toolRoutes
);

app.use(
  "/api/convert",
  convertRoutes
);

/* =========================================================
   FRONTEND REACT ERROR LOGGING
========================================================= */

app.post(
  "/api/logs/client",
  (req, res) => {
    try {
      const {
        type,
        message,
        stack,
        componentStack,
        url,
        pathname,
        search,
        hash,
        timestamp,
        userAgent,
      } = req.body;

      logger.error(`
============================================================
CLIENT / REACT ERROR
============================================================

Type:
${type || "REACT_ERROR"}

Time:
${timestamp || new Date().toISOString()}

Page URL:
${url || "Unknown"}

Page Path:
${pathname || "Unknown"}

Query String:
${search || "None"}

Hash:
${hash || "None"}

Error Message:
${message || "Unknown React Error"}

Stack:
${stack || "N/A"}

Component Stack:
${componentStack || "N/A"}

User Agent:
${userAgent || "N/A"}

============================================================
`);

      return res.status(200).json({
        success: true,
        message:
          "Frontend error logged successfully.",
      });
    } catch (error) {
      logger.error(`
============================================================
CLIENT ERROR LOGGER FAILED
============================================================

Message:
${error?.message || error}

Stack:
${error?.stack || "N/A"}

============================================================
`);

      return res.status(500).json({
        success: false,
        message:
          "Failed to save frontend error.",
      });
    }
  }
);

/* =========================================================
   5. HEALTH CHECK
========================================================= */
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message:
      "API server is running.",
  });
});

/* =========================================================
   6. 404 HANDLER
========================================================= */
app.use((req, res) => {
  logger.warn(
    `404 Route not found: ${req.method} ${req.originalUrl} - IP: ${req.ip}`
  );

  res.status(404).json({
    success: false,
    message:
      "API route not found.",
  });
});

/* =========================================================
   7. ERROR HANDLER
========================================================= */
app.use(
  (err, req, res, next) => {
    logger.error(
      `SERVER ERROR: ${err.message} | URL: ${req.originalUrl} | Method: ${req.method} | IP: ${req.ip}\nStack: ${err.stack}`
    );

    if (res.headersSent) {
      return next(err);
    }

    res.status(
      err.status || 500
    ).json({
      success: false,
      message:
        err.message ||
        "Internal server error.",
    });
  }
);

/* =========================================================
   8. START SERVER
========================================================= */
const startServer = async () => {
  try {
    await connectDB();

    const PORT =
      process.env.PORT || 8000;

    app.listen(
      PORT,
      () => {
        logger.info(
          `Server running on http://localhost:${PORT}`
        );

        console.log("");

        console.log(
          "======================================"
        );

        console.log(
          `Server running on http://localhost:${PORT}`
        );

        console.log(
          `Tools extract: http://localhost:${PORT}/api/tools/extract`
        );

        console.log(
          `Tools download: http://localhost:${PORT}/api/tools/download`
        );

        console.log(
          "======================================"
        );
      }
    );
  } catch (error) {
    logger.error(
      `Failed to start server: ${error.message}\nStack: ${
        error.stack || "N/A"
      }`
    );

    console.error(
      "Failed to start server:",
      error.message
    );

    process.exit(1);
  }
};

startServer();