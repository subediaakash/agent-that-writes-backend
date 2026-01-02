import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { PlannerSchema } from "../types/types.js";
import type { PlannerOutput } from "../types/types.js";
import { config } from "../config/index.js";
import { createChildLogger } from "../utils/logger.js";
import { withRetry } from "../utils/retry.js";

export async function runPlanner(
    userPrompt: string,
    requestId: string,
): Promise<PlannerOutput> {
    const plannerLogger = createChildLogger({
        requestId,
        component: "planner",
    });

    plannerLogger.info("Starting planning phase");

    const result = await withRetry(
        async () => {
            return await generateObject({
                model: openai(config.openai.model),
                schema: PlannerSchema,
                prompt: buildPlannerPrompt(userPrompt),
            });
        },
        { maxRetries: 3, baseDelayMs: 1000 },
        "planner-generation",
    );

    plannerLogger.info(
        { fileCount: result.object.files.length, stack: result.object.stack },
        "Planning complete",
    );

    return result.object;
}

function buildPlannerPrompt(userPrompt: string): string {
    return `You are a senior backend architect.

Task:
Generate a deterministic file structure for a backend project.

Stack:
- Node.js
- Express
- TypeScript
- PostgreSQL
- Prisma ORM

Architecture rules:
- Layered architecture
- src/app.ts → Express app setup
- src/server.ts → HTTP server bootstrap
- src/routes/
- src/controllers/
- src/services/
- src/middleware/
- src/utils/

Prisma rules:
- Include prisma/schema.prisma
- Include prisma/migrations (empty directory allowed)
- Prisma Client must be initialized in a single shared module

Configuration rules:
- Use environment variables only
- Include env.example
- Database URL via environment variables

API rules:
- Include a health check endpoint
- Include centralized error handling middleware

Restrictions:
- No extra frameworks or tooling
- No Docker, ESLint, Prettier, or test setup
- Only essential files
- No explanations
- Output MUST strictly follow the schema

User request:
"${userPrompt}"`;
}
