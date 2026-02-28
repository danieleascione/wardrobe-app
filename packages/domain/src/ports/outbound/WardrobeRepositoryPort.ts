import type { Wardrobe } from '../../entities/Wardrobe.js';

/**
 * Outbound port — Wardrobe persistence.
 *
 * item_count is maintained by a DB trigger (BR-01). updateItemCount exposes
 * the delta-based adjustment as a domain contract so use cases can signal
 * the infrastructure layer to apply the increment/decrement.
 */
export interface WardrobeRepositoryPort {
  /** Retrieve the Wardrobe owned by a user. Returns null when not found. */
  findByUserId(userId: string): Promise<Wardrobe | null>;

  /**
   * Apply a signed delta to item_count on the specified Wardrobe.
   * Positive delta: item added. Negative delta: item removed.
   */
  updateItemCount(wardrobeId: string, delta: number): Promise<void>;
}
