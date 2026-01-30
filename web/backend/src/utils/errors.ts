/**
 * RFC 7807 Problem Details for HTTP APIs
 * https://tools.ietf.org/html/rfc7807
 */

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  [key: string]: unknown;
}

const BASE_ERROR_URI = 'https://pmspec.io/errors';

/**
 * Base application error class implementing RFC 7807
 */
export class AppError extends Error {
  public readonly type: string;
  public readonly title: string;
  public readonly status: number;
  public readonly detail?: string;
  public readonly instance?: string;

  constructor(options: {
    type?: string;
    title: string;
    status: number;
    detail?: string;
    instance?: string;
    message?: string;
  }) {
    super(options.message || options.detail || options.title);
    this.type = options.type || `${BASE_ERROR_URI}/error`;
    this.title = options.title;
    this.status = options.status;
    this.detail = options.detail;
    this.instance = options.instance;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toProblemDetails(): ProblemDetails {
    return {
      type: this.type,
      title: this.title,
      status: this.status,
      ...(this.detail && { detail: this.detail }),
      ...(this.instance && { instance: this.instance }),
    };
  }
}

/**
 * 404 Not Found Error
 */
export class NotFoundError extends AppError {
  constructor(options: { detail?: string; instance?: string; resource?: string } = {}) {
    super({
      type: `${BASE_ERROR_URI}/not-found`,
      title: 'Resource Not Found',
      status: 404,
      detail: options.detail || (options.resource ? `${options.resource} not found` : 'The requested resource was not found'),
      instance: options.instance,
    });
  }
}

/**
 * 400 Bad Request Error
 */
export class BadRequestError extends AppError {
  constructor(options: { detail?: string; instance?: string } = {}) {
    super({
      type: `${BASE_ERROR_URI}/bad-request`,
      title: 'Bad Request',
      status: 400,
      detail: options.detail || 'The request was malformed or contains invalid parameters',
      instance: options.instance,
    });
  }
}

/**
 * 400 Validation Error
 */
export class ValidationError extends AppError {
  public readonly errors?: Array<{ field: string; message: string }>;

  constructor(options: {
    detail?: string;
    instance?: string;
    errors?: Array<{ field: string; message: string }>;
  } = {}) {
    super({
      type: `${BASE_ERROR_URI}/validation-error`,
      title: 'Validation Error',
      status: 400,
      detail: options.detail || 'The request contains invalid data',
      instance: options.instance,
    });
    this.errors = options.errors;
  }

  toProblemDetails(): ProblemDetails {
    const details = super.toProblemDetails();
    if (this.errors && this.errors.length > 0) {
      details.errors = this.errors;
    }
    return details;
  }
}

/**
 * 401 Unauthorized Error
 */
export class UnauthorizedError extends AppError {
  constructor(options: { detail?: string; instance?: string } = {}) {
    super({
      type: `${BASE_ERROR_URI}/unauthorized`,
      title: 'Unauthorized',
      status: 401,
      detail: options.detail || 'Authentication is required to access this resource',
      instance: options.instance,
    });
  }
}

/**
 * 403 Forbidden Error
 */
export class ForbiddenError extends AppError {
  constructor(options: { detail?: string; instance?: string } = {}) {
    super({
      type: `${BASE_ERROR_URI}/forbidden`,
      title: 'Forbidden',
      status: 403,
      detail: options.detail || 'You do not have permission to access this resource',
      instance: options.instance,
    });
  }
}

/**
 * 409 Conflict Error
 */
export class ConflictError extends AppError {
  constructor(options: { detail?: string; instance?: string; resource?: string } = {}) {
    super({
      type: `${BASE_ERROR_URI}/conflict`,
      title: 'Conflict',
      status: 409,
      detail: options.detail || (options.resource ? `${options.resource} already exists` : 'The resource already exists'),
      instance: options.instance,
    });
  }
}

/**
 * 500 Internal Server Error
 */
export class InternalServerError extends AppError {
  constructor(options: { detail?: string; instance?: string } = {}) {
    super({
      type: `${BASE_ERROR_URI}/internal-error`,
      title: 'Internal Server Error',
      status: 500,
      detail: options.detail || 'An unexpected error occurred',
      instance: options.instance,
    });
  }
}
