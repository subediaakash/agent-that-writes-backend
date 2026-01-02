import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import fs from 'fs';
import path from 'path';
import type { PlannerOutput } from '../types/types.ts';
import { FileSchema } from '../types/types.ts';

const WORKSPACE_ROOT = path.resolve('workspace');

export async function generateFile(
    filePath: string,
    purpose: string,
    plan: PlannerOutput
) {
    const result = await generateObject({
        model: openai('gpt-5.1'),
        schema: FileSchema,
        prompt: `
You are a backend code generator.

Stack:
- Node.js
- Express
- TypeScript

File to generate:
${filePath}

Purpose:
${purpose}

Rules:
- Generate ONLY this file
- Valid TypeScript or JSON
- No markdown
- No explanations
- Do not assume other files exist
`
    });

    const fullPath = path.join(WORKSPACE_ROOT, result.object.path);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, result.object.content, 'utf-8');
}
