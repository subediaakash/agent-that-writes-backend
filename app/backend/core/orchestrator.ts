import fs from "fs";
import path from "path";
import { runPlanner } from "./agents/planner.js";
import { generateFile } from "./agents/code-generator.js";
import { config } from "./config/index.js";
import { createChildLogger, logger } from "./utils/logger.js";
import { AppError } from "./middleware/errorHandler.js";
import type { PlannerOutput } from "./types/types.js";

export interface JobResult {
    success: boolean;
    message: string;
    files: string[];
    errors?: string[];
    duration: number;
}

export interface FileGenerationResult {
    path: string;
    success: boolean;
    error?: string;
}

export async function runJob(
    userPrompt: string,
    requestId: string,
): Promise<JobResult> {
    const startTime = Date.now();
    const jobLogger = createChildLogger({
        requestId,
        component: "orchestrator",
    });
    const workspaceRoot = path.resolve(config.workspaceRoot);

    jobLogger.info({ prompt: userPrompt.slice(0, 100) }, "Starting job");

    try {
        // Clean workspace
        await cleanWorkspace(workspaceRoot, jobLogger);

        // 1️⃣ Planning phase
        jobLogger.info("Running planner agent");
        const plan = await runPlanner(userPrompt, requestId);

        // Validate plan
        validatePlan(plan, jobLogger);

        // 2️⃣ Code generation phase (parallel with concurrency limit)
        jobLogger.info(
            { fileCount: plan.files.length },
            "Starting code generation",
        );
        const results = await generateFilesParallel(
            plan,
            workspaceRoot,
            requestId,
            jobLogger,
        );

        // Process results
        const successfulFiles = results.filter((r) => r.success).map((r) =>
            r.path
        );
        const failedFiles = results.filter((r) => !r.success);

        const duration = Date.now() - startTime;

        if (failedFiles.length > 0) {
            jobLogger.warn(
                {
                    successCount: successfulFiles.length,
                    failCount: failedFiles.length,
                },
                "Job completed with some failures",
            );

            return {
                success: failedFiles.length < results.length, // Partial success if some files generated
                message: failedFiles.length === results.length
                    ? "All file generations failed"
                    : "Backend generated with some errors",
                files: successfulFiles,
                errors: failedFiles.map((f) => `${f.path}: ${f.error}`),
                duration,
            };
        }

        jobLogger.info(
            { duration, fileCount: successfulFiles.length },
            "Job completed successfully",
        );

        return {
            success: true,
            message: "Backend generated successfully",
            files: successfulFiles,
            duration,
        };
    } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error
            ? error.message
            : "Unknown error";

        jobLogger.error({ error: errorMessage, duration }, "Job failed");

        throw error;
    }
}

async function cleanWorkspace(
    workspaceRoot: string,
    jobLogger: ReturnType<typeof createChildLogger>,
) {
    try {
        fs.rmSync(workspaceRoot, { recursive: true, force: true });
        fs.mkdirSync(workspaceRoot, { recursive: true });
        jobLogger.debug("Workspace cleaned");
    } catch (error) {
        const message = error instanceof Error
            ? error.message
            : "Unknown error";
        throw new AppError(
            `Failed to prepare workspace: ${message}`,
            500,
            "WORKSPACE_ERROR",
        );
    }
}

function validatePlan(
    plan: PlannerOutput,
    jobLogger: ReturnType<typeof createChildLogger>,
) {
    if (!plan.files || plan.files.length === 0) {
        throw new AppError("Planner returned no files", 400, "INVALID_PLAN");
    }

    if (plan.files.length > config.limits.maxFilesPerJob) {
        throw new AppError(
            `Plan exceeds maximum file limit (${plan.files.length} > ${config.limits.maxFilesPerJob})`,
            400,
            "PLAN_TOO_LARGE",
        );
    }

    // Check for path traversal attempts
    for (const file of plan.files) {
        if (file.path.includes("..") || path.isAbsolute(file.path)) {
            throw new AppError(
                `Invalid file path: ${file.path}`,
                400,
                "INVALID_PATH",
            );
        }
    }

    jobLogger.debug({ fileCount: plan.files.length }, "Plan validated");
}

async function generateFilesParallel(
    plan: PlannerOutput,
    workspaceRoot: string,
    requestId: string,
    jobLogger: ReturnType<typeof createChildLogger>,
): Promise<FileGenerationResult[]> {
    const concurrencyLimit = 3; // Generate 3 files at a time
    const results: FileGenerationResult[] = [];

    // Process files in batches
    for (let i = 0; i < plan.files.length; i += concurrencyLimit) {
        const batch = plan.files.slice(i, i + concurrencyLimit);

        jobLogger.debug(
            {
                batch: batch.map((f) => f.path),
                batchIndex: Math.floor(i / concurrencyLimit) + 1,
            },
            "Processing batch",
        );

        const batchResults = await Promise.allSettled(
            batch.map(async (file) => {
                try {
                    await generateFile(
                        file.path,
                        file.purpose,
                        plan,
                        workspaceRoot,
                        requestId,
                    );
                    return {
                        path: file.path,
                        success: true,
                    } as FileGenerationResult;
                } catch (error) {
                    const errorMessage = error instanceof Error
                        ? error.message
                        : "Unknown error";
                    jobLogger.warn(
                        { file: file.path, error: errorMessage },
                        "File generation failed",
                    );
                    return {
                        path: file.path,
                        success: false,
                        error: errorMessage,
                    } as FileGenerationResult;
                }
            }),
        );

        // Extract results from settled promises
        for (const result of batchResults) {
            if (result.status === "fulfilled") {
                results.push(result.value);
            } else {
                results.push({
                    path: "unknown",
                    success: false,
                    error: result.reason?.message || "Unknown error",
                });
            }
        }
    }

    return results;
}
