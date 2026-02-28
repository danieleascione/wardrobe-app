import type { SupabaseClient } from '@supabase/supabase-js';
import { Item } from '@pocketwardrobe/domain';
import type { ItemRepositoryPort } from '@pocketwardrobe/domain';

// ── DB row type — internal to adapter, never escapes boundary ─────────────────

interface ItemRow {
  item_id: string;
  user_id: string;
  wardrobe_id: string;
  photo_url_original: string;
  photo_url_thumbnail: string;
  name: string;
  color_primary: string;
  color_hex: string | null;
  category: string;
  subcategory: string;
  seasons: string[];
  occasions: string[];
  fabric: string | null;
  ai_confidence: number | null;
  manual_classification: boolean;
  last_worn_at: string | null;
  created_at: string;
  updated_at: string;
  status: string;
}

// ── SupabaseItemRepository ────────────────────────────────────────────────────

export class SupabaseItemRepository implements ItemRepositoryPort {
  constructor(private readonly client: SupabaseClient) {}

  async save(item: Item): Promise<void> {
    const row = this.toRow(item);
    const { error } = await this.client
      .from('items')
      .upsert(row, { onConflict: 'item_id' });

    if (error) {
      throw new Error(`SupabaseItemRepository.save failed: ${error.message}`);
    }
  }

  async findById(itemId: string): Promise<Item | null> {
    const { data, error } = await this.client
      .from('items')
      .select('*')
      .eq('item_id', itemId)
      .maybeSingle();

    if (error) {
      throw new Error(`SupabaseItemRepository.findById failed: ${error.message}`);
    }

    return data ? this.toDomain(data as ItemRow) : null;
  }

  async findByWardrobe(wardrobeId: string): Promise<Item[]> {
    const { data, error } = await this.client
      .from('items')
      .select('*')
      .eq('wardrobe_id', wardrobeId)
      .eq('status', 'active');

    if (error) {
      throw new Error(`SupabaseItemRepository.findByWardrobe failed: ${error.message}`);
    }

    return (data as ItemRow[]).map((row) => this.toDomain(row));
  }

  async delete(itemId: string): Promise<void> {
    const { error } = await this.client
      .from('items')
      .update({ status: 'deleted', updated_at: new Date().toISOString() })
      .eq('item_id', itemId);

    if (error) {
      throw new Error(`SupabaseItemRepository.delete failed: ${error.message}`);
    }
  }

  async findByOccasionAndSeason(
    wardrobeId: string,
    occasion: string,
    season: string,
  ): Promise<Item[]> {
    const { data, error } = await this.client
      .from('items')
      .select('*')
      .eq('wardrobe_id', wardrobeId)
      .eq('status', 'active')
      .contains('occasions', [occasion])
      .contains('seasons', [season]);

    if (error) {
      throw new Error(
        `SupabaseItemRepository.findByOccasionAndSeason failed: ${error.message}`,
      );
    }

    return (data as ItemRow[]).map((row) => this.toDomain(row));
  }

  // ── Mapping — DB row ↔ domain entity ────────────────────────────────────────

  private toRow(item: Item): ItemRow {
    return {
      item_id: item.item_id,
      user_id: item.user_id,
      wardrobe_id: item.wardrobe_id,
      photo_url_original: item.photo_url_original,
      photo_url_thumbnail: item.photo_url_thumbnail,
      name: item.name,
      color_primary: item.color_primary,
      color_hex: item.color_hex,
      category: item.category,
      subcategory: item.subcategory,
      seasons: [...item.seasons],
      occasions: [...item.occasions],
      fabric: item.fabric,
      ai_confidence: item.ai_confidence,
      manual_classification: item.manual_classification,
      last_worn_at: item.last_worn_at ? item.last_worn_at.toISOString() : null,
      created_at: item.created_at.toISOString(),
      updated_at: item.updated_at.toISOString(),
      status: item.status,
    };
  }

  private toDomain(row: ItemRow): Item {
    return new Item({
      item_id: row.item_id,
      user_id: row.user_id,
      wardrobe_id: row.wardrobe_id,
      photo_url_original: row.photo_url_original,
      photo_url_thumbnail: row.photo_url_thumbnail,
      name: row.name,
      color_primary: row.color_primary,
      color_hex: row.color_hex,
      category: row.category,
      subcategory: row.subcategory,
      seasons: row.seasons,
      occasions: row.occasions,
      fabric: row.fabric,
      ai_confidence: row.ai_confidence,
      manual_classification: row.manual_classification,
      last_worn_at: row.last_worn_at ? new Date(row.last_worn_at) : null,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      status: row.status as Item['status'],
    });
  }
}
