import logger from "../utils/logger.js";

// Simple API key authentication (optional)
export const authenticateApiKey = (req, res, next) => {
    const apiKey = req.headers["x-api-key"];

    if (process.env.NODE_ENV === "production" && process.env.API_KEY) {
        if (!apiKey || apiKey !== process.env.API_KEY) {
            logger.warn(`Unauthorized access attempt from IP: ${req.ip}`);
            return res.status(401).json({ error: "Unauthorized" });
        }
    }

    next();
};

// Request logging middleware
export const logRequests = (req, res, next) => {
    const start = Date.now();

    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date().toISOString(),
    });

    res.on("finish", () => {
        const duration = Date.now() - start;
        logger.info(
            `${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`,
            {
                ip: req.ip,
                duration,
                statusCode: res.statusCode,
            }
        );
    });

    next();
};

export default { authenticateApiKey, logRequests };
