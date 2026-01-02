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

    return `You are a senior backend code generator.

Stack:
- Node.js
- Express
- TypeScript
- PostgreSQL
- Prisma ORM

Project context:
- Package manager: ${plan.packageManager}
- Architecture: Layered (routes → controllers → services → db)
- Runtime: Node.js (ESM)

Existing files in the project:
${otherFiles}

File to generate:
${filePath}

Purpose of this file:
${purpose}

STRICT RULES (must follow all):

GENERAL:
- Generate ONLY the content of this file
- Output must be valid TypeScript or valid JSON
- No markdown, no explanations, no comments describing the code
- Use ES module syntax only (import / export)
- Use async/await (no .then chains)
- Follow production-ready coding standards

EXPRESS RULES:
- Route handlers and controllers must be async
- Errors must be forwarded using next(error)
- Do NOT send responses inside services
- Do NOT swallow errors
- Do NOT start the server in non-server files

PRISMA RULES:
- Prisma is the ONLY ORM
- Do NOT use Mongoose or any other ORM
- Do NOT define database models outside Prisma
- schema.prisma must define all database models
- Use Prisma relations, enums, and constraints properly
- Import PrismaClient ONLY from the shared Prisma module
- NEVER instantiate PrismaClient inside route handlers or services

DATABASE RULES:
- All database access must go through Prisma
- No raw SQL unless absolutely required
- No database logic inside routes

ENVIRONMENT RULES:
- Access configuration only via process.env
- Do NOT hardcode secrets, URLs, ports, or credentials
- Assume env.example already documents required variables

STYLE & SAFETY:
- Prefer explicit typing over implicit any
- Avoid side effects during module import
- Keep functions small and single-purpose
- Do not add unused exports or dead code

IMPORTANT:
- If this file is schema.prisma, generate ONLY Prisma schema syntax
- If this file is a route/controller/service, follow the layered architecture strictly
- The generated content must integrate cleanly with the existing files listed above`;
}
