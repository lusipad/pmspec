import { Request, Response, NextFunction } from 'express';
import { AppError, ProblemDetails } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Global error handler middleware implementing RFC 7807 Problem Details
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const instance = req.originalUrl;
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Log the error
  logger.error({ err, path: req.path, method: req.method }, 'Request error');

  // Handle known AppError instances
  if (err instanceof AppError) {
    const problemDetails: ProblemDetails = {
      ...err.toProblemDetails(),
      instance: err.instance || instance,
    };

    // Add stack trace in development
    if (isDevelopment && err.stack) {
      problemDetails.stack = err.stack;
    }

    res
      .status(err.status)
      .type('application/problem+json')
      .json(problemDetails);
    return;
  }

  // Handle unknown errors as 500 Internal Server Error
  const problemDetails: ProblemDetails = {
    type: 'https://pmspec.io/errors/internal-error',
    title: 'Internal Server Error',
    status: 500,
    detail: isDevelopment ? err.message : 'An unexpected error occurred',
    instance,
  };

  // Add stack trace in development
  if (isDevelopment && err.stack) {
    problemDetails.stack = err.stack;
  }

  res
    .status(500)
    .type('application/problem+json')
    .json(problemDetails);
}

/**
 * 404 Not Found handler for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  const problemDetails: ProblemDetails = {
    type: 'https://pmspec.io/errors/not-found',
    title: 'Not Found',
    status: 404,
    detail: `The requested endpoint ${req.method} ${req.path} does not exist`,
    instance: req.originalUrl,
  };

  res
    .status(404)
    .type('application/problem+json')
    .json(problemDetails);
}
