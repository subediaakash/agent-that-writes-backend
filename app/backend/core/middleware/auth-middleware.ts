import type { NextFunction, Request, Response } from "express";
import { auth } from "../utils/auth.js";

export const authMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const session = await auth.api.getSession({
        headers: req.headers,
    });
    if (!session) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    next();
};
