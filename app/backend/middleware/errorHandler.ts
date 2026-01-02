import type { NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger.js";
import { config } from "../config/index.js";
import { RetryError } from "../utils/retry.js";

export class AppError extends Error {
    constructor(
        message: string,
        public readonly statusCode: number = 500,
        public readonly code: string = "INTERNAL_ERROR",
        public readonly isOperational: boolean = true,
    ) {
        super(message);
        this.name = "AppError";
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    constructor(message: string) {
        super(message, 400, "VALIDATION_ERROR");
    }
}

export class NotFoundError extends AppError {
    constructor(message: string = "Resource not found") {
        super(message, 404, "NOT_FOUND");
    }
}

export class RateLimitError extends AppError {
    constructor(message: string = "Rate limit exceeded") {
        super(message, 429, "RATE_LIMIT_EXCEEDED");
    }
}

export class AIServiceError extends AppError {
    constructor(message: string = "AI service error") {
        super(message, 503, "AI_SERVICE_ERROR");
    }
}

export function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction,
) {
    const requestId = req.id || "unknown";

    // Log the error
    logger.error(
        {
            requestId,
            error: err.message,
            stack: config.isDevelopment ? err.stack : undefined,
            path: req.path,
            method: req.method,
        },
        "Request error",
    );

    // Handle known operational errors
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            error: err.code,
            message: err.message,
            requestId,
        });
        return;
    }

    // Handle retry errors
    if (err instanceof RetryError) {
        res.status(503).json({
            error: "SERVICE_UNAVAILABLE",
            message: "Service temporarily unavailable. Please try again later.",
            requestId,
        });
        return;
    }

    // Handle Zod validation errors
    if (err.name === "ZodError") {
        res.status(400).json({
            error: "VALIDATION_ERROR",
            message: "Invalid request data",
            requestId,
        });
        return;
    }

    // Unknown errors - don't leak details in production
    res.status(500).json({
        error: "INTERNAL_ERROR",
        message: config.isProduction
            ? "An unexpected error occurred"
            : err.message,
        requestId,
    });
}

export function notFoundHandler(req: Request, res: Response) {
    res.status(404).json({
        error: "NOT_FOUND",
        message: `Route ${req.method} ${req.path} not found`,
        requestId: req.id,
    });
}
