import type { WearEvent } from '../../entities/WearEvent.js';
import type { WearEventRepositoryPort } from '../../ports/outbound/WearEventRepositoryPort.js';

/**
 * In-memory implementation of WearEventRepositoryPort.
 *
 * findByItemId scans all events and returns those whose items_worn
 * list contains the queried itemId.
 */
export class InMemoryWearEventRepository implements WearEventRepositoryPort {
  private readonly events: Map<string, WearEvent> = new Map();

  async save(wearEvent: WearEvent): Promise<void> {
    this.events.set(wearEvent.wear_event_id, wearEvent);
  }

  async findByItemId(itemId: string): Promise<WearEvent[]> {
    const result: WearEvent[] = [];
    for (const event of this.events.values()) {
      if (event.items_worn.includes(itemId)) {
        result.push(event);
      }
    }
    return result;
  }

  reset(): void {
    this.events.clear();
  }
}
