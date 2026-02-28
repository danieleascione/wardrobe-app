import type { SupabaseClient } from '@supabase/supabase-js';
import { Wardrobe } from '@pocketwardrobe/domain';
import type { WardrobeRepositoryPort } from '@pocketwardrobe/domain';

// ── DB row type — internal to adapter, never escapes boundary ─────────────────

interface WardrobeRow {
  wardrobe_id: string;
  user_id: string;
  item_count: number;
  first_unlock_achieved: boolean;
  created_at: string;
  updated_at: string;
}

// ── SupabaseWardrobeRepository ────────────────────────────────────────────────

export class SupabaseWardrobeRepository implements WardrobeRepositoryPort {
  constructor(private readonly client: SupabaseClient) {}

  async findByUserId(userId: string): Promise<Wardrobe | null> {
    const { data, error } = await this.client
      .from('wardrobes')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`SupabaseWardrobeRepository.findByUserId failed: ${error.message}`);
    }

    return data ? this.toDomain(data as WardrobeRow) : null;
  }

  async updateItemCount(wardrobeId: string, delta: number): Promise<void> {
    // Use a raw SQL increment to avoid race conditions on concurrent updates.
    // The DB trigger already handles item_count for direct item INSERT/UPDATE;
    // this method handles explicit application-level adjustments when needed.
    const { error } = await this.client.rpc('increment_item_count', {
      p_wardrobe_id: wardrobeId,
      p_delta: delta,
    });

    if (error) {
      throw new Error(
        `SupabaseWardrobeRepository.updateItemCount failed: ${error.message}`,
      );
    }
  }

  // ── Mapping ─────────────────────────────────────────────────────────────────

  private toDomain(row: WardrobeRow): Wardrobe {
    return new Wardrobe({
      wardrobe_id: row.wardrobe_id,
      user_id: row.user_id,
      item_count: row.item_count,
      first_unlock_achieved: row.first_unlock_achieved,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    });
  }
}
