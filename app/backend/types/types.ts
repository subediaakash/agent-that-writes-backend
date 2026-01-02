import { z } from 'zod';

export const PlannerSchema = z.object({
    stack: z.literal('node-express-ts'),
    packageManager: z.enum(['npm', 'pnpm', 'yarn']),
    modules: z.array(z.string()),
    files: z.array(
        z.object({
            path: z.string(),
            purpose: z.string()
        })
    )
});

export type PlannerOutput = z.infer<typeof PlannerSchema>;

export const FileSchema = z.object({
    path: z.string(),
    content: z.string()
});

export type FileOutput = z.infer<typeof FileSchema>;
