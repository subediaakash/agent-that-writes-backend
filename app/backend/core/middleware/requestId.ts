import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "crypto";

declare global {
    namespace Express {
        interface Request {
            id: string;
        }
    }
}

export function requestIdMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    const requestId = (req.headers["x-request-id"] as string) || randomUUID();
    req.id = requestId;
    res.setHeader("x-request-id", requestId);
    next();
}
