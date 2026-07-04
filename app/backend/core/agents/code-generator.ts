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

const MAX_REGEN_ATTEMPTS = 3;

const FORBIDDEN_LIBRARIES = [
    "mongoose",
    "sequelize",
    "typeorm",
];

export async function generateFile(
    filePath: string,
    purpose: string,
    plan: PlannerOutput,
    workspaceRoot: string,
    requestId: string,
): Promise<void> {
    const logger = createChildLogger({
        requestId,
        component: "code-generator",
        file: filePath,
    });

    const isPrismaSchema = filePath === "prisma/schema.prisma";
    let lastError: string | null = null;

    for (let attempt = 1; attempt <= MAX_REGEN_ATTEMPTS; attempt++) {
        logger.info({ attempt }, "Generating file");

        const result = await withRetry(
            async () => {
                return generateObject({
                    model: openai(config.openai.model),
                    schema: FileSchema,
                    prompt: isPrismaSchema
                        ? buildPrismaSchemaPrompt(purpose, plan, lastError)
                        : buildFilePrompt(filePath, purpose, plan, lastError),
                });
            },
            { maxRetries: 2, baseDelayMs: 500 },
            `file-generation:${filePath}`,
        );

        const content = result.object.content?.trim();

        if (!content) {
            lastError = "Generated empty content";
            continue;
        }

        const violations = validateGeneratedContent(
            content,
            filePath,
            isPrismaSchema,
        );

        if (violations.length > 0) {
            lastError = violations.join("; ");
            logger.warn({ violations }, "Violations detected, regenerating");
            continue;
        }

        writeFileSafely(
            workspaceRoot,
            result.object.path,
            content,
            logger,
        );

        logger.info("File generated successfully");
        return;
    }

    throw new AppError(
        `Failed to generate valid file after ${MAX_REGEN_ATTEMPTS} attempts: ${filePath}`,
        500,
        "REGEN_FAILED",
    );
}

/* ───────────────────────── VALIDATION ───────────────────────── */

function validateGeneratedContent(
    content: string,
    filePath: string,
    isPrismaSchema: boolean,
): string[] {
    const violations: string[] = [];

    for (const lib of FORBIDDEN_LIBRARIES) {
        if (content.includes(lib)) {
            violations.push(`Forbidden library detected: ${lib}`);
        }
    }

    if (!isPrismaSchema && content.includes("new PrismaClient(")) {
        violations.push("PrismaClient instantiated outside shared module");
    }

    if (isPrismaSchema) {
        if (content.includes("import ") || content.includes("export ")) {
            violations.push("TypeScript syntax detected in schema.prisma");
        }
        if (!content.includes("datasource db")) {
            violations.push("Missing datasource db definition");
        }
        if (!content.includes("generator client")) {
            violations.push("Missing Prisma client generator");
        }
    }

    return violations;
}

/* ───────────────────────── FILE WRITE ───────────────────────── */

function writeFileSafely(
    workspaceRoot: string,
    filePath: string,
    content: string,
    logger: ReturnType<typeof createChildLogger>,
) {
    const fullPath = path.join(workspaceRoot, filePath);
    const resolvedPath = path.resolve(fullPath);
    const resolvedRoot = path.resolve(workspaceRoot);

    if (!resolvedPath.startsWith(resolvedRoot)) {
        throw new AppError(
            `Path traversal attempt: ${filePath}`,
            400,
            "PATH_TRAVERSAL",
        );
    }

    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, "utf-8");

    logger.debug("File written to disk");
}

/* ───────────────────────── PROMPTS ───────────────────────── */

function buildFilePrompt(
    filePath: string,
    purpose: string,
    plan: PlannerOutput,
    previousError: string | null,
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
- Prisma ORM (ONLY ORM)

Architecture:
routes → controllers → services → Prisma

Existing files:
${otherFiles}

File to generate:
${filePath}

Purpose:
${purpose}

STRICT RULES:
- Generate ONLY this file
- Valid TypeScript or JSON only
- ES module syntax only
- async/await only
- No explanations, no markdown
- Do NOT use mongoose, sequelize, typeorm
- Do NOT define database models outside Prisma
- Do NOT instantiate PrismaClient here
- Errors must use next(error)
- Services must NOT send HTTP responses
- Use process.env for config

${previousError ? `PREVIOUS FAILURE (DO NOT REPEAT): ${previousError}` : ""}

IMPORTANT:
- Violating any rule makes the output INVALID.`;
}

function buildPrismaSchemaPrompt(
    purpose: string,
    plan: PlannerOutput,
    previousError: string | null,
): string {
    // Extract entity hints from other planned files (controllers, services, routes)
    const entityHints = plan.files
        .filter((f) =>
            f.path.includes("controllers/") ||
            f.path.includes("services/") ||
            f.path.includes("routes/")
        )
        .map((f) => `- ${f.path}: ${f.purpose}`)
        .join("\n");

    return `You are a Prisma schema generator.

Purpose of this schema:
${purpose}

Related files that will use this schema:
${entityHints}

STRICT RULES:
- Output ONLY valid Prisma schema syntax
- PostgreSQL datasource using env("DATABASE_URL")
- Include Prisma Client generator
- Define ALL models required based on the purpose above
- Include proper relations between models (@relation)
- Use appropriate field types (Int, String, Boolean, DateTime, etc.)
- Add @id, @unique, @default annotations as needed
- No TypeScript, no JavaScript, no markdown, no explanations
- No import/export statements

${previousError ? `PREVIOUS FAILURE (DO NOT REPEAT): ${previousError}` : ""}

Generate a complete prisma/schema.prisma that includes ALL entities needed for the described purpose.`;
}
