import type { AIClassification } from '../../value-objects/index.js';

/**
 * Outbound port — AI image processing service.
 *
 * Adapters implementing this port delegate to an external AI service
 * (e.g. OpenAI Vision). The port returns both the structured classification
 * and the URL of the background-removed image (BR-06).
 *
 * All types in the signature are domain types only.
 */
export interface AIProcessorPort {
  /**
   * Process an image buffer through the AI pipeline.
   *
   * Returns:
   * - classification: structured AIClassification derived from the image
   * - backgroundRemovedUrl: URL pointing to the background-removed version
   *   of the image, which must be used as photo_url_thumbnail (BR-06)
   */
  processImage(imageBuffer: Buffer): Promise<{
    classification: AIClassification;
    backgroundRemovedUrl: string;
  }>;
}
