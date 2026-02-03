import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { furlowSchema } from './schemas/index.js';

export interface ValidationError {
  path: string;
  message: string;
  keyword: string;
  params: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

const ajv = new Ajv({
  allErrors: true,
  verbose: true,
  strict: false,
  allowUnionTypes: true,
  validateSchema: false, // Don't validate the schema itself (we use 2020-12 which isn't bundled)
});

addFormats(ajv);

const validate = ajv.compile(furlowSchema);

export function validateFurlowSpec(data: unknown): ValidationResult {
  const valid = validate(data);

  if (valid) {
    return { valid: true, errors: [] };
  }

  const errors: ValidationError[] = (validate.errors ?? []).map((err) => ({
    path: err.instancePath || '/',
    message: err.message ?? 'Unknown validation error',
    keyword: err.keyword,
    params: err.params as Record<string, unknown>,
  }));

  return { valid: false, errors };
}

export function formatValidationErrors(errors: ValidationError[]): string {
  return errors
    .map((err) => `  - ${err.path}: ${err.message}`)
    .join('\n');
}
