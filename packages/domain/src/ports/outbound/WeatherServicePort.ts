import type { WeatherContext } from '../../value-objects/index.js';

/**
 * Outbound port — Weather forecast service.
 *
 * Returns null (never throws) when the forecast is unavailable. Graceful
 * degradation is a domain contract: outfit suggestions must still proceed
 * when weather data cannot be fetched.
 *
 * All types in the signature are domain types only.
 */
export interface WeatherServicePort {
  /**
   * Fetch the weather forecast for a city on a given date.
   *
   * @param city  City name or identifier understood by the adapter.
   * @param date  ISO date string (YYYY-MM-DD) for the forecast day.
   * @returns     WeatherContext when forecast is available, null otherwise.
   */
  fetchForecast(city: string, date: string): Promise<WeatherContext | null>;
}
