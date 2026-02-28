import type { SupabaseClient } from '@supabase/supabase-js';
import { Outfit, WeatherContext } from '@pocketwardrobe/domain';
import type { OutfitRepositoryPort } from '@pocketwardrobe/domain';

// ── DB row type — internal to adapter, never escapes boundary ─────────────────

interface OutfitRow {
  outfit_id: string;
  user_id: string;
  item_ids: string[];
  occasion: string;
  weather_context: WeatherContextJson | null;
  reasoning: string;
  generated_at: string;
  suggestion_date: string;
  status: string;
}

interface WeatherContextJson {
  city: string;
  date: string;
  tempCelsius: number;
  condition: string;
}

// ── SupabaseOutfitRepository ──────────────────────────────────────────────────

export class SupabaseOutfitRepository implements OutfitRepositoryPort {
  constructor(private readonly client: SupabaseClient) {}

  async save(outfit: Outfit): Promise<void> {
    const row = this.toRow(outfit);
    const { error } = await this.client
      .from('outfit_suggestions')
      .upsert(row, { onConflict: 'outfit_id' });

    if (error) {
      throw new Error(`SupabaseOutfitRepository.save failed: ${error.message}`);
    }
  }

  async findByUserId(userId: string): Promise<Outfit[]> {
    const { data, error } = await this.client
      .from('outfit_suggestions')
      .select('*')
      .eq('user_id', userId)
      .order('suggestion_date', { ascending: false });

    if (error) {
      throw new Error(`SupabaseOutfitRepository.findByUserId failed: ${error.message}`);
    }

    return (data as OutfitRow[]).map((row) => this.toDomain(row));
  }

  async findByDateWindow(userId: string, startDate: string, endDate: string): Promise<Outfit[]> {
    const { data, error } = await this.client
      .from('outfit_suggestions')
      .select('*')
      .eq('user_id', userId)
      .gte('suggestion_date', startDate)
      .lte('suggestion_date', endDate)
      .order('suggestion_date', { ascending: false });

    if (error) {
      throw new Error(`SupabaseOutfitRepository.findByDateWindow failed: ${error.message}`);
    }

    return (data as OutfitRow[]).map((row) => this.toDomain(row));
  }

  // ── Mapping ─────────────────────────────────────────────────────────────────

  private toRow(outfit: Outfit): OutfitRow {
    return {
      outfit_id: outfit.outfit_id,
      user_id: outfit.user_id,
      item_ids: [...outfit.item_ids],
      occasion: outfit.occasion,
      weather_context: outfit.weather_context
        ? {
            city: outfit.weather_context.city,
            date: outfit.weather_context.date,
            tempCelsius: outfit.weather_context.tempCelsius,
            condition: outfit.weather_context.condition,
          }
        : null,
      reasoning: outfit.reasoning,
      generated_at: outfit.generated_at.toISOString(),
      suggestion_date: outfit.suggestion_date,
      status: outfit.status,
    };
  }

  private toDomain(row: OutfitRow): Outfit {
    const weatherContext = row.weather_context
      ? new WeatherContext(row.weather_context)
      : null;

    return new Outfit({
      outfit_id: row.outfit_id,
      user_id: row.user_id,
      item_ids: row.item_ids,
      occasion: row.occasion,
      weather_context: weatherContext,
      reasoning: row.reasoning,
      generated_at: new Date(row.generated_at),
      suggestion_date: row.suggestion_date,
      status: row.status as Outfit['status'],
    });
  }
}
