import type { StyleProfile } from '../../entities/StyleProfile.js';
import type { StyleProfileRepositoryPort } from '../../ports/outbound/StyleProfileRepositoryPort.js';

/**
 * In-memory implementation of StyleProfileRepositoryPort.
 *
 * A user has exactly one StyleProfile. Keyed by user_id for O(1) lookup.
 */
export class InMemoryStyleProfileRepository implements StyleProfileRepositoryPort {
  private readonly profiles: Map<string, StyleProfile> = new Map();

  async save(profile: StyleProfile): Promise<void> {
    this.profiles.set(profile.user_id, profile);
  }

  async findByUserId(userId: string): Promise<StyleProfile | null> {
    return this.profiles.get(userId) ?? null;
  }

  reset(): void {
    this.profiles.clear();
  }
}
