import type { Item } from '../../entities/Item.js';
import type { ItemRepositoryPort } from '../../ports/outbound/ItemRepositoryPort.js';

/**
 * In-memory implementation of ItemRepositoryPort.
 *
 * State is stored in a private Map keyed by item_id. The reset() method
 * clears all state between tests without requiring a process restart.
 */
export class InMemoryItemRepository implements ItemRepositoryPort {
  private readonly items: Map<string, Item> = new Map();

  async save(item: Item): Promise<void> {
    this.items.set(item.item_id, item);
  }

  async findById(itemId: string): Promise<Item | null> {
    return this.items.get(itemId) ?? null;
  }

  async findByWardrobe(wardrobeId: string): Promise<Item[]> {
    const result: Item[] = [];
    for (const item of this.items.values()) {
      if (item.wardrobe_id === wardrobeId) {
        result.push(item);
      }
    }
    return result;
  }

  async delete(itemId: string): Promise<void> {
    this.items.delete(itemId);
  }

  async findByOccasionAndSeason(
    wardrobeId: string,
    occasion: string,
    season: string,
  ): Promise<Item[]> {
    const result: Item[] = [];
    for (const item of this.items.values()) {
      if (
        item.wardrobe_id === wardrobeId &&
        item.occasions.includes(occasion) &&
        item.seasons.includes(season)
      ) {
        result.push(item);
      }
    }
    return result;
  }

  reset(): void {
    this.items.clear();
  }
}
