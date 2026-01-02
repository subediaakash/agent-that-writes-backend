import IORedis from "ioredis";
import { config } from "../../core/config/index.js";

export const connection = new IORedis(config.redisUrl, {
    maxRetriesPerRequest: null,
});
