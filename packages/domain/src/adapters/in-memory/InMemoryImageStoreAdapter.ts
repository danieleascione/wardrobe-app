import type { ImageStorePort } from '../../ports/outbound/ImageStorePort.js';

/**
 * In-memory implementation of ImageStorePort.
 *
 * Images are stored in a Map keyed by the opaque storage key. The returned
 * URL includes the key so tests can verify the correct key was used.
 */
export class InMemoryImageStoreAdapter implements ImageStorePort {
  private readonly images: Map<string, Buffer> = new Map();

  async store(key: string, buffer: Buffer): Promise<string> {
    this.images.set(key, buffer);
    return `https://in-memory-store.test/${key}`;
  }

  async delete(key: string): Promise<void> {
    this.images.delete(key);
  }

  reset(): void {
    this.images.clear();
  }
}
