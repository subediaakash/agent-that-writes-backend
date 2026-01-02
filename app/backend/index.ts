import express from "express";
import helmet from "helmet";
import cors from "cors";
import { config } from "./config/index.js";
import { logger } from "./utils/logger.js";
import { requestIdMiddleware } from "./middleware/requestId.js";
import { rateLimiter, strictRateLimiter } from "./middleware/rateLimiter.js";
import {
    generateRequestSchema,
    validateRequest,
} from "./middleware/validator.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { runJob } from "./orchestrator.js";
import type { NextFunction, Request, Response } from "express";

const app = express();

// ===================
// Security Middleware
// ===================
app.use(helmet());
app.use(
    cors({
        origin: config.isProduction
            ? process.env.ALLOWED_ORIGINS?.split(",")
            : "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type", "Authorization", "x-request-id"],
    }),
);

// ===================
// Base Middleware
// ===================
app.use(express.json({ limit: "1mb" }));
app.use(requestIdMiddleware);
app.use(rateLimiter);

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    res.on("finish", () => {
        const duration = Date.now() - startTime;
        logger.info(
            {
                requestId: req.id,
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                duration,
            },
            "Request completed",
        );
    });

    next();
});

// ===================
// Health Endpoints
// ===================
app.get("/health", (_req: Request, res: Response) => {
    res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

app.get("/ready", (_req: Request, res: Response) => {
    // Add checks for external dependencies here
    const checks = {
        openaiApiKey: !!config.openai.apiKey,
    };

    const isReady = Object.values(checks).every(Boolean);

    res.status(isReady ? 200 : 503).json({
        status: isReady ? "ready" : "not_ready",
        checks,
    });
});

// ===================
// API Routes
// ===================
app.post(
    "/generate-backend",
    strictRateLimiter,
    validateRequest(generateRequestSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { prompt } = req.body;

            logger.info(
                { requestId: req.id, promptLength: prompt.length },
                "Starting backend generation",
            );

            const result = await runJob(prompt, req.id);

            res.status(result.success ? 200 : 207).json({
                ...result,
                requestId: req.id,
            });
        } catch (err) {
            next(err);
        }
    },
);

// ===================
// Error Handling
// ===================
app.use(notFoundHandler);
app.use(errorHandler);

// ===================
// Graceful Shutdown
// ===================
const server = app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.nodeEnv }, "Server started");
});

const gracefulShutdown = (signal: string) => {
    logger.info({ signal }, "Received shutdown signal");

    server.close((err) => {
        if (err) {
            logger.error({ error: err.message }, "Error during shutdown");
            process.exit(1);
        }

        logger.info("Server closed gracefully");
        process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
        logger.error("Forced shutdown after timeout");
        process.exit(1);
    }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
    logger.error({ reason, promise }, "Unhandled Rejection");
});

process.on("uncaughtException", (error) => {
    logger.fatal(
        { error: error.message, stack: error.stack },
        "Uncaught Exception",
    );
    process.exit(1);
});

export default app;
