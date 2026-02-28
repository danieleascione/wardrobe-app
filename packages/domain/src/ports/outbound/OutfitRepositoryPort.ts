import type { Outfit } from '../../entities/Outfit.js';

/**
 * Outbound port — Outfit persistence.
 *
 * findByDateWindow supports BR-04 rotation check: the use case must know
 * which outfits were suggested in a given date range before producing a
 * new suggestion, to avoid repeating recent combinations.
 */
export interface OutfitRepositoryPort {
  /** Persist a new or updated Outfit suggestion. */
  save(outfit: Outfit): Promise<void>;

  /** Retrieve all Outfits generated for a user. */
  findByUserId(userId: string): Promise<Outfit[]>;

  /**
   * Retrieve Outfits suggested for a user within an inclusive date window.
   * Dates are ISO date strings (YYYY-MM-DD).
   * Used by BR-04 rotation logic.
   */
  findByDateWindow(userId: string, startDate: string, endDate: string): Promise<Outfit[]>;
}
