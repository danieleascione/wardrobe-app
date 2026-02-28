import { StyleProfile } from '../entities/StyleProfile.js';
import type { StyleArchetype, StylePalette } from '../entities/StyleProfile.js';
import type { StyleProfileRepositoryPort } from '../ports/outbound/StyleProfileRepositoryPort.js';

// BR-09: Default profile values when calibration is skipped
const BR09_ARCHETYPE: StyleArchetype = 'classic';
const BR09_OCCASIONS: ReadonlyArray<string> = ['work', 'casual'];
const BR09_PALETTE: StylePalette = 'neutral';

function generateId(): string {
  return `sp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export class CalibrateStyleUseCase {
  constructor(private readonly styleProfileRepo: StyleProfileRepositoryPort) {}

  /**
   * Skip calibration — persist a StyleProfile with BR-09 defaults.
   * calibration_completed is false; effectivePreferences() will return defaults.
   */
  async skipCalibration(userId: string): Promise<StyleProfile> {
    const now = new Date();
    const profile = new StyleProfile({
      style_profile_id: generateId(),
      user_id: userId,
      archetype: BR09_ARCHETYPE,
      occasion_priorities: [...BR09_OCCASIONS],
      palette: BR09_PALETTE,
      calibration_completed: false,
      calibration_version: 0,
      created_at: now,
      updated_at: now,
    });

    await this.styleProfileRepo.save(profile);
    return profile;
  }

  /**
   * Complete calibration with user-chosen preferences.
   * calibration_completed is true.
   */
  async completeCalibration(
    userId: string,
    archetype: StyleArchetype,
    occasions: string[],
    palette: StylePalette,
  ): Promise<StyleProfile> {
    const now = new Date();
    const existing = await this.styleProfileRepo.findByUserId(userId);
    const profile = new StyleProfile({
      style_profile_id: existing?.style_profile_id ?? generateId(),
      user_id: userId,
      archetype,
      occasion_priorities: occasions,
      palette,
      calibration_completed: true,
      calibration_version: (existing?.calibration_version ?? 0) + 1,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    });

    await this.styleProfileRepo.save(profile);
    return profile;
  }

  /**
   * Update an existing StyleProfile with partial preference changes.
   */
  async updateStyleProfile(
    userId: string,
    updates: Partial<{
      archetype: StyleArchetype;
      occasion_priorities: string[];
      palette: StylePalette;
    }>,
  ): Promise<StyleProfile> {
    const existing = await this.styleProfileRepo.findByUserId(userId);
    if (!existing) {
      throw new Error(`StyleProfile not found for user ${userId}`);
    }

    const now = new Date();
    const profile = new StyleProfile({
      style_profile_id: existing.style_profile_id,
      user_id: existing.user_id,
      archetype: updates.archetype ?? existing.archetype,
      occasion_priorities: updates.occasion_priorities ?? [...existing.occasion_priorities],
      palette: updates.palette ?? existing.palette,
      calibration_completed: existing.calibration_completed,
      calibration_version: existing.calibration_version + 1,
      created_at: existing.created_at,
      updated_at: now,
    });

    await this.styleProfileRepo.save(profile);
    return profile;
  }
}
