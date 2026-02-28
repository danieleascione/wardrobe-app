import type { WearEvent } from '../../entities/WearEvent.js';

/**
 * Outbound port — WearEvent persistence.
 *
 * WearEvents are created only on explicit user acceptance of an outfit (BR-05).
 * findByItemId supports wear-history queries used in rotation scoring.
 */
export interface WearEventRepositoryPort {
  /** Persist a new WearEvent. */
  save(wearEvent: WearEvent): Promise<void>;

  /** Retrieve all WearEvents that include a specific Item. */
  findByItemId(itemId: string): Promise<WearEvent[]>;
}
