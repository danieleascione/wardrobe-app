import type { AIClassification } from '../../value-objects/index.js';
import type { AIProcessorPort } from '../../ports/outbound/AIProcessorPort.js';

interface MockAIConfig {
  classification: AIClassification;
  backgroundRemovedUrl: string;
}

/**
 * Configurable mock implementation of AIProcessorPort.
 *
 * configure() lets test scenarios control the returned classification and
 * background-removed URL without any HTTP calls. reset() removes the
 * configuration so a fresh state is guaranteed between tests.
 *
 * Throws when processImage is called without a prior configure() call —
 * this prevents silently returning garbage data in tests.
 */
export class MockAIProcessor implements AIProcessorPort {
  private config: MockAIConfig | null = null;

  configure(opts: MockAIConfig): void {
    this.config = opts;
  }

  async processImage(
    _imageBuffer: Buffer,
  ): Promise<{ classification: AIClassification; backgroundRemovedUrl: string }> {
    if (this.config === null) {
      throw new Error(
        'MockAIProcessor: configure() must be called before processImage()',
      );
    }
    return {
      classification: this.config.classification,
      backgroundRemovedUrl: this.config.backgroundRemovedUrl,
    };
  }

  reset(): void {
    this.config = null;
  }
}
