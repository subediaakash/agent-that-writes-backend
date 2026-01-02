import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../drizzle/src/index.ts";
import * as schema from "../drizzle/src/db/auth-schema.ts";
import { config } from "../config/index.ts";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema,
    }),
    emailAndPassword: {
        enabled: true,
    },
    trustedOrigins: config.isDevelopment
        ? ["http://localhost:8080", "http://localhost:3000"]
        : process.env.ALLOWED_ORIGINS?.split(",") || [],
    advanced: {
        crossSubDomainCookies: {
            enabled: false,
        },
        // Allow requests without Origin header (for Postman/API testing)
        disableCSRFCheck: config.isDevelopment,
    },
});
