import { z } from "zod";

export const PlannerSchema = z.object({
    stack: z.literal("node-express-ts"),
    packageManager: z.enum(["npm", "pnpm", "yarn"]),
    modules: z.array(z.string()).describe(
        "NPM modules required for the project",
    ),
    files: z
        .array(
            z.object({
                path: z
                    .string()
                    .describe("Relative file path from project root")
                    .refine(
                        (val) => !val.includes(".."),
                        "Path cannot contain ..",
                    ),
                purpose: z.string().describe("What this file does"),
            }),
        )
        .min(1, "At least one file is required")
        .max(20, "Maximum 20 files allowed"),
});

export type PlannerOutput = z.infer<typeof PlannerSchema>;

export const FileSchema = z.object({
    path: z.string(),
    content: z.string().min(1, "Content cannot be empty"),
});

export type FileOutput = z.infer<typeof FileSchema>;
