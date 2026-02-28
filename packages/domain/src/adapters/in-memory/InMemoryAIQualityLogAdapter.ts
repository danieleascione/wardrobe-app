import type { AIClassification } from '../../value-objects/index.js';
import type { AIQualityLogPort } from '../../ports/outbound/AIQualityLogPort.js';

interface CorrectionRecord {
  itemId: string;
  predicted: AIClassification;
  corrected: AIClassification;
}

/**
 * In-memory implementation of AIQualityLogPort.
 *
 * Corrections are accumulated in an array. getCorrections() exposes the
 * full list for test assertions without requiring a real logging pipeline.
 */
export class InMemoryAIQualityLogAdapter implements AIQualityLogPort {
  private readonly corrections: CorrectionRecord[] = [];

  async logCorrection(
    itemId: string,
    predicted: AIClassification,
    corrected: AIClassification,
  ): Promise<void> {
    this.corrections.push({ itemId, predicted, corrected });
  }

  /** Test-only query — exposes recorded corrections for assertion. */
  getCorrections(): ReadonlyArray<CorrectionRecord> {
    return [...this.corrections];
  }

  reset(): void {
    this.corrections.length = 0;
  }
}
