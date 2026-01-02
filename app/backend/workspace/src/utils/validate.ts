export type Validator<T> = (value: unknown) => T;

export class ValidationError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 400, details?: unknown) {
    super(message);
    this.name = 'ValidationError';
    this.status = status;
    this.details = details;
  }
}

export function requireField<T extends object, K extends keyof T>(
  payload: T,
  field: K,
  message?: string
): asserts payload is T & Required<Pick<T, K>> {
  if (payload[field] === undefined || payload[field] === null) {
    throw new ValidationError(message || `Missing required field: ${String(field)}`);
  }
}

export function isString(value: unknown, message?: string): string {
  if (typeof value !== 'string') {
    throw new ValidationError(message || 'Expected string');
  }
  return value;
}

export function isNonEmptyString(value: unknown, message?: string): string {
  const str = isString(value, message || 'Expected non-empty string');
  if (!str.trim()) {
    throw new ValidationError(message || 'Expected non-empty string');
  }
  return str;
}

export function isNumber(value: unknown, message?: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new ValidationError(message || 'Expected number');
  }
  return value;
}

export function isBoolean(value: unknown, message?: string): boolean {
  if (typeof value !== 'boolean') {
    throw new ValidationError(message || 'Expected boolean');
  }
  return value;
}

export function isArray<T = unknown>(
  value: unknown,
  message?: string
): T[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(message || 'Expected array');
  }
  return value as T[];
}

export function isObject<T extends object = Record<string, unknown>>(
  value: unknown,
  message?: string
): T {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError(message || 'Expected object');
  }
  return value as T;
}

export function optional<T>(
  validator: Validator<T>
): Validator<T | undefined> {
  return (value: unknown) => {
    if (value === undefined || value === null) return undefined;
    return validator(value);
  };
}

export function oneOf<T extends readonly unknown[]>(
  allowed: T,
  message?: string
): Validator<T[number]> {
  const set = new Set(allowed as readonly unknown[]);
  return (value: unknown) => {
    if (!set.has(value)) {
      throw new ValidationError(
        message || `Value must be one of: ${allowed.map(String).join(', ')}`
      );
    }
    return value as T[number];
  };
}

export function validateShape<T extends Record<string, Validator<any>>>(
  shape: T,
  payload: unknown,
  messagePrefix = 'Invalid payload'
): { [K in keyof T]: ReturnType<T[K]> } {
  const obj = isObject<Record<string, unknown>>(payload, `${messagePrefix}: expected object`);
  const result: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  for (const key of Object.keys(shape)) {
    const validator = shape[key];
    try {
      result[key] = validator(obj[key]);
    } catch (err) {
      if (err instanceof ValidationError) {
        errors[key] = err.message;
      } else if (err instanceof Error) {
        errors[key] = err.message;
      } else {
        errors[key] = 'Invalid value';
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(`${messagePrefix}`, 400, errors);
  }

  return result as { [K in keyof T]: ReturnType<T[K]> };
}

export type ShapeOf<T> = {
  [K in keyof T]: Validator<T[K]>;
};

export function validatePayload<T>(
  payload: unknown,
  shape: ShapeOf<T>,
  messagePrefix?: string
): T {
  return validateShape(shape as Record<string, Validator<any>>, payload, messagePrefix) as T;
}
