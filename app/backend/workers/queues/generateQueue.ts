// queues/generateQueue.ts
import { Queue } from "bullmq";
import { connection } from "../lib/redis.ts";

export interface GenerateJobData {
    prompt: string;
    requestId: string;
    userId?: string; // If you add auth later
}

export interface GenerateJobResult {
    success: boolean;
    files: string[];
    errors?: string[];
}

export const generateQueue = new Queue<GenerateJobData, GenerateJobResult>(
    "generate-backend",
    {
        connection: connection,
        defaultJobOptions: {
            attempts: 3, 
            backoff: {
                type: "exponential",
                delay: 5000, // 5s, 10s, 20s
            },
            removeOnComplete: {
                age: 3600, // Keep completed jobs for 1 hour
                count: 100, // Keep last 100 jobs
            },
            removeOnFail: {
                age: 86400, // Keep failed jobs for 24 hours
            },
        },
    },
);
