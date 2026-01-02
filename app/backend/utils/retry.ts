import { logger } from "./logger.js";

export interface RetryOptions {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
}

const defaultOptions: RetryOptions = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
};

export class RetryError extends Error {
    constructor(
        message: string,
        public readonly attempts: number,
        public readonly lastError: Error,
    ) {
        super(message);
        this.name = "RetryError";
    }
}

export async function withRetry<T>(
    fn: () => Promise<T>,
    options: Partial<RetryOptions> = {},
    context: string = "operation",
): Promise<T> {
    const opts = { ...defaultOptions, ...options };
    let lastError: Error = new Error("Unknown error");

    for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error
                ? error
                : new Error(String(error));

            if (attempt === opts.maxRetries) {
                logger.error(
                    { context, attempt, error: lastError.message },
                    `All ${opts.maxRetries} retry attempts failed`,
                );
                throw new RetryError(
                    `${context} failed after ${opts.maxRetries} attempts: ${lastError.message}`,
                    attempt,
                    lastError,
                );
            }

            const delay = Math.min(
                opts.baseDelayMs *
                    Math.pow(opts.backoffMultiplier, attempt - 1),
                opts.maxDelayMs,
            );

            logger.warn(
                {
                    context,
                    attempt,
                    nextRetryMs: delay,
                    error: lastError.message,
                },
                `Attempt ${attempt} failed, retrying...`,
            );

            await sleep(delay);
        }
    }

    throw new RetryError(`${context} failed`, opts.maxRetries, lastError);
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
