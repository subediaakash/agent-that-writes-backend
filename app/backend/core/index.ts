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
import type { NextFunction, Request, Response } from "express";
import { generateQueue } from "../workers/queues/generateQueue.js";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./utils/auth.js";

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

app.all("/api/auth/{*path}", toNodeHandler(auth));

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

            const job = await generateQueue.add("generate-backend", {
                prompt,
                requestId: req.id,
            });

            logger.info(
                { requestId: req.id, promptLength: prompt.length },
                "Starting backend generation",
            );

            res.status(202).json({
                message: "Job queued",
                jobId: job.id,
                statusUrl: `/jobs/${job.id}`,
            });
        } catch (err) {
            next(err);
        }
    },
);

// Check job status
app.get(
    "/jobs/:jobId",
    async (req: Request<{ jobId: string }>, res: Response) => {
        const { jobId } = req.params;
        const job = await generateQueue.getJob(jobId);

        if (!job) {
            res.status(404).json({ error: "Job not found" });
            return;
        }

        const state = await job.getState();
        const progress = job.progress;

        res.json({
            jobId: job.id,
            state, // "waiting" | "active" | "completed" | "failed"
            progress,
            result: state === "completed" ? job.returnvalue : undefined,
            error: state === "failed" ? job.failedReason : undefined,
            createdAt: job.timestamp,
        });
    },
);

// Cancel a job
app.delete(
    "/jobs/:jobId",
    async (req: Request<{ jobId: string }>, res: Response) => {
        const { jobId } = req.params;
        const job = await generateQueue.getJob(jobId);

        if (!job) {
            res.status(404).json({ error: "Job not found" });
            return;
        }

        await job.remove();
        res.json({ message: "Job cancelled" });
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
