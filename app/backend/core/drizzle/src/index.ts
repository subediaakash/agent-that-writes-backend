import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../../../.env") });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
export const db = drizzle({ client: pool });
