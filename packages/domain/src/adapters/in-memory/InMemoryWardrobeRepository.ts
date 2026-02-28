import { Wardrobe } from '../../entities/Wardrobe.js';
import type { WardrobeRepositoryPort } from '../../ports/outbound/WardrobeRepositoryPort.js';

/**
 * In-memory implementation of WardrobeRepositoryPort.
 *
 * item_count is maintained via updateItemCount delta adjustments, mirroring
 * the DB trigger behaviour (BR-01). The extra save() method is not part of
 * the port but is needed to seed wardrobe state in tests.
 */
export class InMemoryWardrobeRepository implements WardrobeRepositoryPort {
  private readonly wardrobes: Map<string, Wardrobe> = new Map();

  /** Seed method — not on port — used to insert wardrobe state in tests. */
  async save(wardrobe: Wardrobe): Promise<void> {
    this.wardrobes.set(wardrobe.wardrobe_id, wardrobe);
  }

  async findByUserId(userId: string): Promise<Wardrobe | null> {
    for (const wardrobe of this.wardrobes.values()) {
      if (wardrobe.user_id === userId) {
        return wardrobe;
      }
    }
    return null;
  }

  async updateItemCount(wardrobeId: string, delta: number): Promise<void> {
    const existing = this.wardrobes.get(wardrobeId);
    if (!existing) return;
    const updated = new Wardrobe({
      wardrobe_id: existing.wardrobe_id,
      user_id: existing.user_id,
      item_count: existing.item_count + delta,
      first_unlock_achieved: existing.first_unlock_achieved,
      created_at: existing.created_at,
      updated_at: new Date(),
    });
    this.wardrobes.set(wardrobeId, updated);
  }

  reset(): void {
    this.wardrobes.clear();
  }
}
