/**
 * Parser-specific errors
 */

import { FurlowError } from './base.js';
import { ErrorCodes } from './codes.js';

export class YamlSyntaxError extends FurlowError {
  constructor(message: string, file?: string, line?: number, column?: number) {
    super({
      code: ErrorCodes.PARSE_YAML_SYNTAX,
      message: `YAML syntax error: ${message}`,
      file,
      line,
      column,
    });
    this.name = 'YamlSyntaxError';
  }
}

export class ImportNotFoundError extends FurlowError {
  constructor(importPath: string, fromFile?: string) {
    super({
      code: ErrorCodes.PARSE_IMPORT_NOT_FOUND,
      message: `Import not found: ${importPath}`,
      file: fromFile,
      context: { importPath },
    });
    this.name = 'ImportNotFoundError';
  }
}

export class CircularImportError extends FurlowError {
  constructor(cycle: string[]) {
    super({
      code: ErrorCodes.PARSE_CIRCULAR_IMPORT,
      message: `Circular import detected: ${cycle.join(' -> ')}`,
      context: { cycle },
    });
    this.name = 'CircularImportError';
  }
}

export class SchemaValidationError extends FurlowError {
  public readonly validationErrors: Array<{
    path: string;
    message: string;
  }>;

  constructor(
    errors: Array<{ path: string; message: string }>,
    file?: string
  ) {
    const errorList = errors.map((e) => `  ${e.path}: ${e.message}`).join('\n');
    super({
      code: ErrorCodes.PARSE_SCHEMA_VALIDATION,
      message: `Schema validation failed:\n${errorList}`,
      file,
      context: { errors },
    });
    this.name = 'SchemaValidationError';
    this.validationErrors = errors;
  }
}

export class EnvNotFoundError extends FurlowError {
  constructor(varName: string, file?: string, line?: number) {
    super({
      code: ErrorCodes.PARSE_ENV_NOT_FOUND,
      message: `Environment variable not found: ${varName}`,
      file,
      line,
      context: { varName },
    });
    this.name = 'EnvNotFoundError';
  }
}
