import type { ConsentLogPort } from '../../ports/outbound/ConsentLogPort.js';

interface ConsentEvent {
  userId: string;
  granted: boolean;
}

/**
 * In-memory implementation of ConsentLogPort.
 *
 * Consent decisions are recorded in insertion order. The most recent
 * decision per user determines isConsentGranted. getConsentEvents()
 * exposes the full event log for test assertions.
 */
export class InMemoryConsentLogAdapter implements ConsentLogPort {
  private readonly events: ConsentEvent[] = [];

  async logConsent(userId: string, granted: boolean): Promise<void> {
    this.events.push({ userId, granted });
  }

  async isConsentGranted(userId: string): Promise<boolean> {
    // Walk events in reverse to find the most recent decision for this user
    for (let i = this.events.length - 1; i >= 0; i--) {
      if (this.events[i].userId === userId) {
        return this.events[i].granted;
      }
    }
    return false;
  }

  /** Test-only query — exposes the full event log for assertion. */
  getConsentEvents(): ReadonlyArray<ConsentEvent> {
    return [...this.events];
  }

  reset(): void {
    this.events.length = 0;
  }
}
