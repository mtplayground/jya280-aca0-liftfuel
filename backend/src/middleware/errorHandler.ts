import type { ErrorRequestHandler } from 'express';

import { isHttpError } from '../errors';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (isHttpError(err)) {
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message
      }
    });
  }

  console.error('Unhandled request error', {
    code: typeof err === 'object' && err !== null && 'code' in err ? err.code : undefined,
    message: err instanceof Error ? err.message : String(err),
    name: err instanceof Error ? err.name : typeof err,
    stack: err instanceof Error ? err.stack : undefined
  });

  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Something went wrong.'
    }
  });
};
