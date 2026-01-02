import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { config } from "../../config/index.js";

const pool = new Pool({
    connectionString: config.databaseUrl,
});
export const db = drizzle({ client: pool });
