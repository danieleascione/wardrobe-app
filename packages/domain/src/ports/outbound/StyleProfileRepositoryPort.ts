import type { StyleProfile } from '../../entities/StyleProfile.js';

/**
 * Outbound port — StyleProfile persistence.
 *
 * A user has exactly one StyleProfile. findByUserId returns null when the
 * user has not yet completed or skipped calibration — callers must handle
 * the null case by applying BR-09 defaults via StyleProfile.effectivePreferences().
 */
export interface StyleProfileRepositoryPort {
  /** Persist a new or updated StyleProfile. */
  save(profile: StyleProfile): Promise<void>;

  /** Retrieve the StyleProfile owned by a user. Returns null when not found. */
  findByUserId(userId: string): Promise<StyleProfile | null>;
}
