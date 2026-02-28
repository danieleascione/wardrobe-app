export type AIProcessingErrorCode =
  | 'AI_UNAVAILABLE'
  | 'AI_CLASSIFICATION_FAILED'
  | 'AI_INVALID_RESPONSE';

/**
 * Domain error for AI processing failures.
 * Pure domain concept — does NOT extend HTTP error types.
 */
export class AIProcessingError extends Error {
  readonly errorCode: AIProcessingErrorCode;

  constructor(errorCode: AIProcessingErrorCode, message: string) {
    super(message);
    this.name = 'AIProcessingError';
    this.errorCode = errorCode;
    Object.freeze(this);
  }
}
