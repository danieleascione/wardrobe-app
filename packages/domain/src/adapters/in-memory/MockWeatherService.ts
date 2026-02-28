import type { WeatherContext } from '../../value-objects/index.js';
import type { WeatherServicePort } from '../../ports/outbound/WeatherServicePort.js';

/**
 * Configurable mock implementation of WeatherServicePort.
 *
 * configure(context | null) lets tests control the returned WeatherContext
 * or simulate an API failure by passing null. The default state (before any
 * configure() call or after reset()) returns null, matching the port's
 * graceful-degradation contract.
 */
export class MockWeatherService implements WeatherServicePort {
  private context: WeatherContext | null = null;

  configure(context: WeatherContext | null): void {
    this.context = context;
  }

  async fetchForecast(_city: string, _date: string): Promise<WeatherContext | null> {
    return this.context;
  }

  reset(): void {
    this.context = null;
  }
}
