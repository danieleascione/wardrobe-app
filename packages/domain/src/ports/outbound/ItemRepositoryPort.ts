import type { Item } from '../../entities/Item.js';

/**
 * Outbound port — Item persistence.
 *
 * Adapters implementing this port handle the infrastructure concern of
 * storing and retrieving Item entities. All method signatures reference
 * only domain types — zero external library types permitted.
 */
export interface ItemRepositoryPort {
  /** Persist a new or updated Item. */
  save(item: Item): Promise<void>;

  /** Retrieve an Item by its unique identifier. Returns null when not found. */
  findById(itemId: string): Promise<Item | null>;

  /** Retrieve all active Items belonging to a Wardrobe. */
  findByWardrobe(wardrobeId: string): Promise<Item[]>;

  /** Soft- or hard-delete an Item by its unique identifier. */
  delete(itemId: string): Promise<void>;

  /**
   * Retrieve Items matching both an occasion tag and a season tag
   * within a given Wardrobe. Used by outfit-suggestion use cases.
   */
  findByOccasionAndSeason(
    wardrobeId: string,
    occasion: string,
    season: string,
  ): Promise<Item[]>;
}
