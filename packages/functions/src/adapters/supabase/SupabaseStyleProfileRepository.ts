import type { SupabaseClient } from '@supabase/supabase-js';
import { StyleProfile } from '@pocketwardrobe/domain';
import type { StyleProfileRepositoryPort } from '@pocketwardrobe/domain';
import type { StyleArchetype, StylePalette } from '@pocketwardrobe/domain';

// ── DB row type — internal to adapter, never escapes boundary ─────────────────

interface StyleProfileRow {
  style_profile_id: string;
  user_id: string;
  archetype: string;
  occasion_priorities: string[];
  palette: string;
  calibration_completed: boolean;
  calibration_version: number;
  created_at: string;
  updated_at: string;
}

// ── SupabaseStyleProfileRepository ───────────────────────────────────────────

export class SupabaseStyleProfileRepository implements StyleProfileRepositoryPort {
  constructor(private readonly client: SupabaseClient) {}

  async save(profile: StyleProfile): Promise<void> {
    const row = this.toRow(profile);
    const { error } = await this.client
      .from('style_profiles')
      .upsert(row, { onConflict: 'style_profile_id' });

    if (error) {
      throw new Error(`SupabaseStyleProfileRepository.save failed: ${error.message}`);
    }
  }

  async findByUserId(userId: string): Promise<StyleProfile | null> {
    const { data, error } = await this.client
      .from('style_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(
        `SupabaseStyleProfileRepository.findByUserId failed: ${error.message}`,
      );
    }

    return data ? this.toDomain(data as StyleProfileRow) : null;
  }

  // ── Mapping ─────────────────────────────────────────────────────────────────

  private toRow(profile: StyleProfile): StyleProfileRow {
    return {
      style_profile_id: profile.style_profile_id,
      user_id: profile.user_id,
      archetype: profile.archetype,
      occasion_priorities: [...profile.occasion_priorities],
      palette: profile.palette,
      calibration_completed: profile.calibration_completed,
      calibration_version: profile.calibration_version,
      created_at: profile.created_at.toISOString(),
      updated_at: profile.updated_at.toISOString(),
    };
  }

  private toDomain(row: StyleProfileRow): StyleProfile {
    return new StyleProfile({
      style_profile_id: row.style_profile_id,
      user_id: row.user_id,
      archetype: row.archetype as StyleArchetype,
      occasion_priorities: row.occasion_priorities,
      palette: row.palette as StylePalette,
      calibration_completed: row.calibration_completed,
      calibration_version: row.calibration_version,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    });
  }
}
