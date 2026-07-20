export class HttpError extends Error {
  readonly code: string;
  readonly fields?: Record<string, string>;
  readonly status: number;

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string>
  ) {
    super(message);
    this.code = code;
    this.fields = fields;
    this.name = 'HttpError';
    this.status = status;
  }
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}
