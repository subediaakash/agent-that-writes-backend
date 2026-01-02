// worker.ts (separate process!)
import { Worker } from "bullmq";
import { connection } from "./lib/redis.js";
import { runJob } from "../core/orchestrator.js";
import { logger } from "../core/utils/logger.ts";
import type {
    GenerateJobData,
    GenerateJobResult,
} from "./queues/generateQueue.js";

const worker = new Worker<GenerateJobData, GenerateJobResult>(
    "generate-backend",
    async (job) => {
        const { prompt, requestId } = job.data;

        logger.info({ jobId: job.id, requestId }, "Processing job");

        // Update progress
        await job.updateProgress(10);

        // Run the actual generation
        const result = await runJob(prompt, requestId);

        await job.updateProgress(100);

        return {
            success: result.success,
            files: result.files,
            errors: result.errors,
        };
    },
    {
        connection: connection,
        concurrency: 2, // Process 2 jobs at a time
    },
);

// Event handlers
worker.on("completed", (job, result) => {
    logger.info({ jobId: job.id, files: result.files }, "Job completed");
});

worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, "Job failed");
});

worker.on("progress", (job, progress) => {
    logger.debug({ jobId: job.id, progress }, "Job progress");
});

logger.info("Worker started");
