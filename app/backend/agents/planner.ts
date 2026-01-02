import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { PlannerSchema } from '../types/types.ts';
import type { PlannerOutput } from '../types/types.ts';

export async function runPlanner(userPrompt: string): Promise<PlannerOutput> {
    const result = await generateObject({
        model: openai('gpt-5.1'),
        schema: PlannerSchema,
        prompt: `
You are a senior backend architect.

Task:
Generate a deterministic file structure for a backend project.

Rules:
- Stack: Node.js + Express + TypeScript
- No extra frameworks
- No explanations
- Only essential files
- Output MUST follow schema

User request:
"${userPrompt}"
`
    });

    return result.object;
}
