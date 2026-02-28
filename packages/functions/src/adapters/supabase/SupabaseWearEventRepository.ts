import type { SupabaseClient } from '@supabase/supabase-js';
import { WearEvent } from '@pocketwardrobe/domain';
import type { WearEventRepositoryPort } from '@pocketwardrobe/domain';

// ── DB row type — internal to adapter, never escapes boundary ─────────────────

interface WearEventRow {
  wear_event_id: string;
  user_id: string;
  outfit_id: string;
  items_worn: string[];
  worn_date: string;
  created_at: string;
}

// ── SupabaseWearEventRepository ───────────────────────────────────────────────

export class SupabaseWearEventRepository implements WearEventRepositoryPort {
  constructor(private readonly client: SupabaseClient) {}

  async save(wearEvent: WearEvent): Promise<void> {
    const row = this.toRow(wearEvent);
    const { error } = await this.client
      .from('wear_events')
      .upsert(row, { onConflict: 'wear_event_id' });

    if (error) {
      throw new Error(`SupabaseWearEventRepository.save failed: ${error.message}`);
    }
  }

  async findByItemId(itemId: string): Promise<WearEvent[]> {
    // PostgreSQL: items_worn @> ARRAY[itemId] (containment check)
    const { data, error } = await this.client
      .from('wear_events')
      .select('*')
      .contains('items_worn', [itemId]);

    if (error) {
      throw new Error(`SupabaseWearEventRepository.findByItemId failed: ${error.message}`);
    }

    return (data as WearEventRow[]).map((row) => this.toDomain(row));
  }

  // ── Mapping ─────────────────────────────────────────────────────────────────

  private toRow(wearEvent: WearEvent): WearEventRow {
    return {
      wear_event_id: wearEvent.wear_event_id,
      user_id: wearEvent.user_id,
      outfit_id: wearEvent.outfit_id,
      items_worn: [...wearEvent.items_worn],
      worn_date: wearEvent.worn_date,
      created_at: wearEvent.created_at.toISOString(),
    };
  }

  private toDomain(row: WearEventRow): WearEvent {
    return new WearEvent({
      wear_event_id: row.wear_event_id,
      user_id: row.user_id,
      outfit_id: row.outfit_id,
      items_worn: row.items_worn,
      worn_date: row.worn_date,
      created_at: new Date(row.created_at),
    });
  }
}
