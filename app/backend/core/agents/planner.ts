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

Rules:
- Stack: Node.js + Express + TypeScript
- No extra frameworks
- No explanations
- Only essential files
- Output MUST follow schema
- Include proper error handling patterns
- Include a health check endpoint
- Use environment variables for configuration

User request:
"${userPrompt}"`;
}
