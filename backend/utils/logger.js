import {
  createLogger,
  format,
  transports,
} from "winston";

import path from "path";
import fs from "fs";

import {
  fileURLToPath,
} from "url";

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);

/* =========================================================
   LOG DIRECTORY
========================================================= */

const logDirectory =
  path.join(
    __dirname,
    "../logs"
  );

if (
  !fs.existsSync(logDirectory)
) {
  fs.mkdirSync(
    logDirectory,
    {
      recursive: true,
    }
  );
}

/* =========================================================
   LOG FORMAT
========================================================= */

const logFormat =
  format.printf(
    ({
      timestamp,
      level,
      message,
      stack,
    }) => {
      return `[${timestamp}] [${level.toUpperCase()}]: ${
        stack || message
      }`;
    }
  );

/* =========================================================
   LOGGER
========================================================= */

export const logger =
  createLogger({
    level: "info",

    format: format.combine(
      format.timestamp({
        format:
          "YYYY-MM-DD HH:mm:ss",
      }),

      format.errors({
        stack: true,
      }),

      logFormat
    ),

    transports: [
      /* =====================================================
         ERROR LOG
      ===================================================== */

      new transports.File({
        filename:
          path.join(
            logDirectory,
            "error.log"
          ),

        level: "error",
      }),

      /* =====================================================
         COMBINED LOG
      ===================================================== */

      new transports.File({
        filename:
          path.join(
            logDirectory,
            "combined.log"
          ),
      }),
    ],
  });

/* =========================================================
   DEVELOPMENT CONSOLE
========================================================= */

if (
  process.env.NODE_ENV !==
  "production"
) {
  logger.add(
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      ),
    })
  );
}