import rateLimit from "express-rate-limit";
import { config } from "../config/index.js";

export const rateLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: {
        error: "Too many requests",
        message: `Rate limit exceeded. Please try again after ${
            config.rateLimit.windowMs / 1000
        } seconds.`,
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.ip || req.headers["x-forwarded-for"]?.toString() ||
            "unknown";
    },
});

// Stricter rate limit for expensive operations like code generation
export const strictRateLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs * 2,
    max: Math.floor(config.rateLimit.maxRequests / 2),
    message: {
        error: "Too many requests",
        message:
            "Generation rate limit exceeded. Please wait before making another request.",
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.ip || req.headers["x-forwarded-for"]?.toString() ||
            "unknown";
    },
});
