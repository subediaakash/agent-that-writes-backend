import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import fs from "fs";
import path from "path";
import type { PlannerOutput } from "../types/types.js";
import { FileSchema } from "../types/types.js";
import { config } from "../config/index.js";
import { createChildLogger } from "../utils/logger.js";
import { withRetry } from "../utils/retry.js";
import { AppError } from "../middleware/errorHandler.js";

export async function generateFile(
    filePath: string,
    purpose: string,
    plan: PlannerOutput,
    workspaceRoot: string,
    requestId: string,
): Promise<void> {
    const fileLogger = createChildLogger({
        requestId,
        component: "code-generator",
        file: filePath,
    });

    fileLogger.debug("Generating file");

    const result = await withRetry(
        async () => {
            return await generateObject({
                model: openai(config.openai.model),
                schema: FileSchema,
                prompt: buildFilePrompt(filePath, purpose, plan),
            });
        },
        { maxRetries: 3, baseDelayMs: 1000 },
        `file-generation:${filePath}`,
    );

    // Validate generated content
    if (!result.object.content || result.object.content.trim().length === 0) {
        throw new AppError(
            `Generated empty content for ${filePath}`,
            500,
            "EMPTY_CONTENT",
        );
    }

    // Write file to workspace
    const fullPath = path.join(workspaceRoot, result.object.path);

    // Security: ensure the file is within workspace
    const resolvedPath = path.resolve(fullPath);
    const resolvedWorkspace = path.resolve(workspaceRoot);

    if (!resolvedPath.startsWith(resolvedWorkspace)) {
        throw new AppError(
            `Path traversal attempt detected: ${filePath}`,
            400,
            "PATH_TRAVERSAL",
        );
    }

    try {
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, result.object.content, "utf-8");
        fileLogger.info("File generated successfully");
    } catch (error) {
        const message = error instanceof Error
            ? error.message
            : "Unknown error";
        throw new AppError(
            `Failed to write file ${filePath}: ${message}`,
            500,
            "FILE_WRITE_ERROR",
        );
    }
}

function buildFilePrompt(
    filePath: string,
    purpose: string,
    plan: PlannerOutput,
): string {
    const otherFiles = plan.files
        .filter((f) => f.path !== filePath)
        .map((f) => `- ${f.path}: ${f.purpose}`)
        .join("\n");

    return `You are a backend code generator.

Stack:
- Node.js
- Express
- TypeScript

Project Context:
Package Manager: ${plan.packageManager}
Other files in project:
${otherFiles}

File to generate:
${filePath}

Purpose:
${purpose}

Rules:
- Generate ONLY this file's content
- Valid TypeScript or JSON
- No markdown code blocks
- No explanations or comments about the code
- Use ES module imports (import/export)
- Follow best practices for production code
- Include proper error handling where appropriate
- Use environment variables for sensitive data`;
}
