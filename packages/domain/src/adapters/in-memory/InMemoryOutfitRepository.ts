import type { Outfit } from '../../entities/Outfit.js';
import type { OutfitRepositoryPort } from '../../ports/outbound/OutfitRepositoryPort.js';

/**
 * In-memory implementation of OutfitRepositoryPort.
 *
 * findByDateWindow filters by suggestion_date within the inclusive
 * [startDate, endDate] window (ISO date string lexicographic comparison).
 */
export class InMemoryOutfitRepository implements OutfitRepositoryPort {
  private readonly outfits: Map<string, Outfit> = new Map();

  async save(outfit: Outfit): Promise<void> {
    this.outfits.set(outfit.outfit_id, outfit);
  }

  async findByUserId(userId: string): Promise<Outfit[]> {
    const result: Outfit[] = [];
    for (const outfit of this.outfits.values()) {
      if (outfit.user_id === userId) {
        result.push(outfit);
      }
    }
    return result;
  }

  async findByDateWindow(userId: string, startDate: string, endDate: string): Promise<Outfit[]> {
    const result: Outfit[] = [];
    for (const outfit of this.outfits.values()) {
      if (
        outfit.user_id === userId &&
        outfit.suggestion_date >= startDate &&
        outfit.suggestion_date <= endDate
      ) {
        result.push(outfit);
      }
    }
    return result;
  }

  reset(): void {
    this.outfits.clear();
  }
}
