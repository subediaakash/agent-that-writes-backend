import fs from 'fs';
import path from 'path';
import { runPlanner } from './agents/planner.js';
import { generateFile } from './agents/code-generator.ts';

const WORKSPACE_ROOT = path.resolve('workspace');

export async function runJob(userPrompt: string) {
    // clean workspace
    fs.rmSync(WORKSPACE_ROOT, { recursive: true, force: true });
    fs.mkdirSync(WORKSPACE_ROOT, { recursive: true });

    // 1️⃣ Planner
    const plan = await runPlanner(userPrompt);

    // 2️⃣ Code generation (file-by-file)
    for (const file of plan.files) {
        await generateFile(file.path, file.purpose, plan);
    }

    return {
        message: 'Backend generated successfully',
        files: plan.files.map(f => f.path)
    };
}
