/**
 * Base error class for all iLoveVideoEditor SDK errors.
 *
 * Provides the HTTP status code and the parsed response body when available,
 * making it easy for callers to handle specific API error cases.
 */
export class ILoveVideoEditorError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly responseBody?: unknown,
  ) {
    super(message);
    this.name = 'ILoveVideoEditorError';
  }
}
