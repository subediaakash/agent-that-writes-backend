import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load .env file if it exists, but do not fail if it doesn't
const envFilePath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envFilePath)) {
  dotenv.config({ path: envFilePath });
}

type NodeEnv = 'development' | 'test' | 'production';

const getNodeEnv = (): NodeEnv => {
  const env = process.env.NODE_ENV as NodeEnv | undefined;
  if (!env) return 'development';
  if (!['development', 'test', 'production'].includes(env)) {
    return 'development';
  }
  return env;
};

const nodeEnv = getNodeEnv();

const getRequired = (key: string): string => {
  const value = process.env[key];
  if (typeof value === 'undefined' || value === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const getNumber = (key: string, defaultValue?: number): number | undefined => {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return defaultValue;
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number`);
  }
  return parsed;
};

const getBoolean = (key: string, defaultValue?: boolean): boolean | undefined => {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return defaultValue;
  const normalized = raw.toLowerCase().trim();
  if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  throw new Error(`Environment variable ${key} must be a boolean-like value`);
};

export const env = {
  nodeEnv,
  isDev: nodeEnv === 'development',
  isProd: nodeEnv === 'production',
  isTest: nodeEnv === 'test',

  app: {
    name: process.env.APP_NAME || 'app',
    port: getNumber('PORT', 3000)!,
    host: process.env.HOST || '0.0.0.0',
    url: process.env.APP_URL || `http://localhost:${getNumber('PORT', 3000)}`,
  },

  log: {
    level: process.env.LOG_LEVEL || (nodeEnv === 'production' ? 'info' : 'debug'),
    pretty: getBoolean('LOG_PRETTY', nodeEnv !== 'production')!,
  },

  security: {
    jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },

  db: {
    url: process.env.DATABASE_URL,
  },

  raw: process.env,
};

export type Env = typeof env;

export default env;
