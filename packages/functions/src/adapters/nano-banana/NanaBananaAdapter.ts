import nodeFetch from 'node-fetch';
import { AIClassification, AIProcessingError } from '@pocketwardrobe/domain';
import type { AIProcessorPort } from '@pocketwardrobe/domain';

// ── Nano Banana API contract (internal to adapter — never escapes) ──────────

interface NanaBananaRequest {
  imageData: string; // base64-encoded image
  operations: string[];
}

interface NanaBananaClassification {
  name: string;
  category: string;
  subcategory: string;
  color: string;
  colorHex: string | null;
  seasons: string[];
  occasions: string[];
  fabric: string | null;
  confidence: number;
}

interface NanaBananaResponse {
  backgroundRemovedUrl: string;
  classification: NanaBananaClassification;
}

// ── Circuit breaker state (simple counter pattern) ─────────────────────────

interface CircuitBreakerState {
  consecutiveFailures: number;
  openedAt: number | null;
}

// ── Adapter config ─────────────────────────────────────────────────────────

export interface NanaBananaAdapterConfig {
  readonly apiKey: string;
  readonly baseUrl: string;
  /** HTTP call timeout in ms. Default: 10000. */
  readonly timeoutMs?: number;
  /** Base delay for exponential backoff in ms. Default: 100. */
  readonly retryDelayMs?: number;
  /** Max retry attempts after the initial call. Default: 3. */
  readonly maxRetries?: number;
  /** Consecutive failures before circuit opens. Default: 3. */
  readonly circuitBreakerThreshold?: number;
  /** Milliseconds circuit stays open before resetting. Default: 30000. */
  readonly circuitResetMs?: number;
}

// ── NanaBananaAdapter ──────────────────────────────────────────────────────

export class NanaBananaAdapter implements AIProcessorPort {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly retryDelayMs: number;
  private readonly maxRetries: number;
  private readonly circuitBreakerThreshold: number;
  private readonly circuitResetMs: number;

  private readonly circuitBreaker: CircuitBreakerState = {
    consecutiveFailures: 0,
    openedAt: null,
  };

  constructor(config: NanaBananaAdapterConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.timeoutMs = config.timeoutMs ?? 10_000;
    this.retryDelayMs = config.retryDelayMs ?? 100;
    this.maxRetries = config.maxRetries ?? 3;
    this.circuitBreakerThreshold = config.circuitBreakerThreshold ?? 3;
    this.circuitResetMs = config.circuitResetMs ?? 30_000;
  }

  async processImage(imageBuffer: Buffer): Promise<{
    classification: AIClassification;
    backgroundRemovedUrl: string;
  }> {
    this.checkCircuitBreaker();

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        await this.delay(this.retryDelayMs * Math.pow(2, attempt - 1));
      }

      try {
        const result = await this.callApi(imageBuffer);
        this.resetCircuitBreaker();
        return result;
      } catch (err) {
        lastError = err as Error;

        // Only retry on transient (5xx / network) errors
        if (!this.isTransient(err)) {
          // Non-transient (4xx) — fail immediately, record failure
          this.recordFailure();
          throw err;
        }
      }
    }

    // Exhausted retries on transient errors
    this.recordFailure();
    throw (
      lastError ??
      new AIProcessingError('AI_UNAVAILABLE', 'AI service unavailable after retries')
    );
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private checkCircuitBreaker(): void {
    if (this.circuitBreaker.openedAt === null) return;

    const elapsed = Date.now() - this.circuitBreaker.openedAt;
    if (elapsed < this.circuitResetMs) {
      throw new AIProcessingError(
        'AI_UNAVAILABLE',
        'AI service circuit breaker open — request rejected'
      );
    }

    // Cooldown elapsed — reset
    this.resetCircuitBreaker();
  }

  private resetCircuitBreaker(): void {
    this.circuitBreaker.consecutiveFailures = 0;
    this.circuitBreaker.openedAt = null;
  }

  private recordFailure(): void {
    this.circuitBreaker.consecutiveFailures++;
    if (this.circuitBreaker.consecutiveFailures >= this.circuitBreakerThreshold) {
      this.circuitBreaker.openedAt = Date.now();
    }
  }

  private isTransient(err: unknown): boolean {
    if (err instanceof AIProcessingError) {
      return err.errorCode === 'AI_UNAVAILABLE';
    }
    // Network-level errors from node-fetch (connection refused, DNS failure, etc.)
    return err instanceof Error && err.name === 'FetchError';
  }

  private async callApi(imageBuffer: Buffer): Promise<{
    classification: AIClassification;
    backgroundRemovedUrl: string;
  }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Awaited<ReturnType<typeof nodeFetch>>;
    try {
      const requestBody: NanaBananaRequest = {
        imageData: imageBuffer.toString('base64'),
        operations: ['background-removal', 'classification'],
      };

      response = await nodeFetch(`${this.baseUrl}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.apiKey,
        },
        body: JSON.stringify(requestBody),
        // node-fetch v3 accepts native AbortSignal
        signal: controller.signal as unknown as import('node-fetch').RequestInit['signal'],
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const isTransient = response.status >= 500;
      if (isTransient) {
        throw new AIProcessingError(
          'AI_UNAVAILABLE',
          `Nano Banana service returned ${response.status}`
        );
      }
      throw new AIProcessingError(
        'AI_CLASSIFICATION_FAILED',
        `Nano Banana classification failed with status ${response.status}`
      );
    }

    const body = (await response.json()) as NanaBananaResponse;
    return this.mapToDomain(body);
  }

  private mapToDomain(body: NanaBananaResponse): {
    classification: AIClassification;
    backgroundRemovedUrl: string;
  } {
    const classification = new AIClassification({
      name: body.classification.name,
      color_primary: body.classification.color,
      color_hex: body.classification.colorHex,
      category: body.classification.category,
      subcategory: body.classification.subcategory,
      seasons: body.classification.seasons,
      occasions: body.classification.occasions,
      fabric: body.classification.fabric,
      ai_confidence: body.classification.confidence,
    });

    return {
      classification,
      backgroundRemovedUrl: body.backgroundRemovedUrl,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
