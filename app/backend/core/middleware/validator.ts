import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { config } from "../config/index.js";

export const generateRequestSchema = z.object({
    prompt: z
        .string()
        .min(10, "Prompt must be at least 10 characters")
        .max(
            config.limits.maxPromptLength,
            `Prompt must not exceed ${config.limits.maxPromptLength} characters`,
        )
        .refine(
            (val) => !containsSuspiciousPatterns(val),
            "Prompt contains potentially harmful patterns",
        ),
    options: z
        .object({
            packageManager: z.enum(["npm", "pnpm", "yarn"]).optional(),
        })
        .optional(),
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;

function containsSuspiciousPatterns(input: string): boolean {
    const suspiciousPatterns = [
        /ignore\s+(previous|all|above)\s+instructions/i,
        /system\s*:\s*/i,
        /\{\{.*\}\}/,
        /<script/i,
    ];
    return suspiciousPatterns.some((pattern) => pattern.test(input));
}

export function validateRequest<T extends z.ZodSchema>(schema: T) {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            const errors = result.error.flatten();
            res.status(400).json({
                error: "Validation failed",
                details: errors.fieldErrors,
            });
            return;
        }

        req.body = result.data;
        next();
    };
}
