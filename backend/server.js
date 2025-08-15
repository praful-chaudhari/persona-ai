import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Import middleware
import { apiRateLimit } from "./middleware/rateLimit.js";
import { logRequests, authenticateApiKey } from "./middleware/auth.js";
import logger from "./utils/logger.js";

// Import routes
import chatRoutes from "./routes/chat.js";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
    })
);

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            process.env.FRONTEND_URL || "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173", // Vite dev server
            "http://127.0.0.1:5173",
        ];

        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            logger.warn(`CORS blocked origin: ${origin}`);
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200, // For legacy browser support
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// General middleware
app.use(logRequests);
app.use(apiRateLimit);

// Health check endpoint
app.get("/health", (req, res) => {
    res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        version: "1.0.0",
    });
});

// Test endpoint
app.get("/test", (req, res) => {
    res.json({
        message: "Server is running!",
        timestamp: new Date().toISOString(),
    });
});

// API routes
app.use("/api/chat", authenticateApiKey, chatRoutes);

// 404 handler - FIXED: Added parameter name after *
app.use("/*path", (req, res) => {
    logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`, {
        ip: req.ip,
    });
    res.status(404).json({
        error: "Route not found",
        method: req.method,
        path: req.originalUrl,
    });
});

// Global error handler
app.use((error, req, res, next) => {
    logger.error("Unhandled error", {
        error: error.message,
        stack: error.stack,
        ip: req.ip,
        method: req.method,
        path: req.originalUrl,
    });

    res.status(500).json({
        error: "Internal server error",
    });
});

// Graceful shutdown
process.on("SIGTERM", () => {
    logger.info("SIGTERM signal received");
    process.exit(0);
});

process.on("SIGINT", () => {
    logger.info("SIGINT signal received");
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    logger.info(`🚀 Server running on http://localhost:${PORT}`);
    logger.info(`📊 Health check: http://localhost:${PORT}/health`);
    logger.info(`🧪 Test endpoint: http://localhost:${PORT}/test`);
    logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
    logger.info(`🔧 API endpoint: http://localhost:${PORT}/api/chat`);
});

export default app;
