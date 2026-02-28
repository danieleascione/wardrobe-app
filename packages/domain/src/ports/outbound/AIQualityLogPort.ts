import type { AIClassification } from '../../value-objects/index.js';

/**
 * Outbound port — AI quality feedback log (BR-10).
 *
 * When a user manually corrects an AI-generated classification, the correction
 * is logged for model-improvement pipelines. Both the original predicted
 * classification and the human-corrected classification are recorded.
 *
 * All types in the signature are domain types only.
 */
export interface AIQualityLogPort {
  /**
   * Record a user correction to an AI-generated classification.
   *
   * @param itemId     Identifier of the Item whose classification was corrected.
   * @param predicted  The original AIClassification produced by the AI.
   * @param corrected  The AIClassification after the user's manual correction.
   */
  logCorrection(
    itemId: string,
    predicted: AIClassification,
    corrected: AIClassification,
  ): Promise<void>;
}
