import rateLimit from "express-rate-limit";
import logger from "../utils/logger.js";

// Rate limiting configuration
const createRateLimit = (options = {}) => {
    return rateLimit({
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
        message: {
            error: "Too many requests from this IP, please try again later.",
            retryAfter: Math.ceil(
                (parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) /
                    1000
            ),
        },
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
        handler: (req, res) => {
            logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
            res.status(429).json({
                error: "Too many requests from this IP, please try again later.",
                retryAfter: Math.ceil(
                    (parseInt(process.env.RATE_LIMIT_WINDOW_MS) ||
                        15 * 60 * 1000) / 1000
                ),
            });
        },
        ...options,
    });
};

// Chat-specific rate limiting (more restrictive)
export const chatRateLimit = createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 15, // 15 chat requests per minute
    message: {
        error: "Too many chat requests, please slow down.",
        retryAfter: 60,
    },
});

// General API rate limiting
export const apiRateLimit = createRateLimit();

export default { chatRateLimit, apiRateLimit };
