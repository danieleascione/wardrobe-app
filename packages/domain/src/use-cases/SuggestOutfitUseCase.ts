import { Outfit } from '../entities/Outfit.js';
import { WearEvent } from '../entities/WearEvent.js';
import type { ItemRepositoryPort } from '../ports/outbound/ItemRepositoryPort.js';
import type { WardrobeRepositoryPort } from '../ports/outbound/WardrobeRepositoryPort.js';
import type { OutfitRepositoryPort } from '../ports/outbound/OutfitRepositoryPort.js';
import type { WearEventRepositoryPort } from '../ports/outbound/WearEventRepositoryPort.js';
import type { WeatherServicePort } from '../ports/outbound/WeatherServicePort.js';

// BR-04: rotation windows (days) — avoid repeating combinations seen within this window
const ROTATION_WINDOW_DAYS_LARGE_WARDROBE = 7; // wardrobe with >= 15 items
const ROTATION_WINDOW_DAYS_SMALL_WARDROBE = 3; // wardrobe with < 15 items
const LARGE_WARDROBE_THRESHOLD = 15;

// BR-03: minimum items required to form a valid outfit
const MIN_OUTFIT_ITEMS = 3;

function generateId(): string {
  return `outfit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function generateWearEventId(): string {
  return `wear-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Subtract N days from an ISO date string (YYYY-MM-DD), returns ISO date string.
 */
function subtractDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * Canonical key for a set of item IDs (order-independent).
 */
function outfitKey(itemIds: ReadonlyArray<string>): string {
  return [...itemIds].sort().join(',');
}

export class SuggestOutfitUseCase {
  constructor(
    private readonly itemRepo: ItemRepositoryPort,
    private readonly wardrobeRepo: WardrobeRepositoryPort,
    private readonly outfitRepo: OutfitRepositoryPort,
    private readonly wearEventRepo: WearEventRepositoryPort,
    private readonly weatherService: WeatherServicePort,
  ) {}

  /**
   * Generate a daily outfit suggestion for the user.
   *
   * BR-01: Returns null when item_count < 5.
   * BR-03: Outfit must contain >= 3 items.
   * BR-04: Skips combinations seen within rotation window (3 or 7 days).
   * Graceful degradation: proceeds without weather when WeatherServicePort returns null.
   */
  async getDailyOutfit(
    userId: string,
    wardrobeId: string,
    occasion: string,
    date: string,
  ): Promise<Outfit | null> {
    // BR-01: check wardrobe item count threshold
    const wardrobe = await this.wardrobeRepo.findByUserId(userId);
    if (!wardrobe || !wardrobe.canSuggestOutfit()) {
      return null;
    }

    // Graceful degradation — proceed even when weather is null
    const weatherContext = await this.weatherService
      .fetchForecast('', date)
      .catch(() => null);

    // Fetch available items for the occasion
    const season = this.dateToSeason(date);
    const items = await this.itemRepo.findByOccasionAndSeason(wardrobeId, occasion, season);

    if (items.length < MIN_OUTFIT_ITEMS) {
      return null;
    }

    // BR-04: determine rotation window based on wardrobe size
    const windowDays =
      wardrobe.item_count >= LARGE_WARDROBE_THRESHOLD
        ? ROTATION_WINDOW_DAYS_LARGE_WARDROBE
        : ROTATION_WINDOW_DAYS_SMALL_WARDROBE;

    const windowStart = subtractDays(date, windowDays);
    const recentOutfits = await this.outfitRepo.findByDateWindow(userId, windowStart, date);
    const recentKeys = new Set(recentOutfits.map((o) => outfitKey(o.item_ids)));

    // Build a candidate outfit — pick first N items whose combination is not in recentKeys
    const selectedIds = this.selectItems(items.map((i) => i.item_id), recentKeys, MIN_OUTFIT_ITEMS);

    const now = new Date();
    const outfit = new Outfit({
      outfit_id: generateId(),
      user_id: userId,
      item_ids: selectedIds,
      occasion,
      weather_context: weatherContext,
      reasoning: 'Daily suggestion',
      generated_at: now,
      suggestion_date: date,
      status: 'active',
    });

    await this.outfitRepo.save(outfit);
    return outfit;
  }

  /**
   * Accept an outfit and record a WearEvent with the user's final item selection.
   *
   * BR-05: WearEvent created only on explicit accept. Outfit entity is NOT mutated.
   */
  async acceptOutfit(
    userId: string,
    outfitId: string,
    finalItemIds: string[],
  ): Promise<WearEvent> {
    const now = new Date();

    // Align worn_date with the outfit's suggestion_date (test expectation BR-05)
    // Fall back to current date if the outfit cannot be located for any reason.
    let wornDate: string;
    try {
      const outfits = await this.outfitRepo.findByUserId(userId);
      const outfit = outfits.find((o) => o.outfit_id === outfitId);
      wornDate = outfit?.suggestion_date ?? now.toISOString().slice(0, 10);
    } catch {
      wornDate = now.toISOString().slice(0, 10);
    }

    const wearEvent = new WearEvent({
      wear_event_id: generateWearEventId(),
      user_id: userId,
      outfit_id: outfitId,
      items_worn: finalItemIds,
      worn_date: wornDate,
      created_at: now,
    });

    await this.wearEventRepo.save(wearEvent);
    return wearEvent;
  }

  /**
   * Invalidate all outfits that reference a deleted item.
   *
   * BR-08: When an item is deleted, any outfit referencing it must be
   * marked 'invalidated' so it cannot be surfaced again.
   */
  async invalidateOutfitsForDeletedItem(userId: string, deletedItemId: string): Promise<void> {
    const allOutfits = await this.outfitRepo.findByUserId(userId);

    for (const outfit of allOutfits) {
      if (outfit.item_ids.includes(deletedItemId)) {
        const invalidated = new Outfit({
          outfit_id: outfit.outfit_id,
          user_id: outfit.user_id,
          item_ids: [...outfit.item_ids],
          occasion: outfit.occasion,
          weather_context: outfit.weather_context,
          reasoning: outfit.reasoning,
          generated_at: outfit.generated_at,
          suggestion_date: outfit.suggestion_date,
          status: 'invalidated',
        });
        await this.outfitRepo.save(invalidated);
      }
    }
  }

  /**
   * Select a set of item IDs for an outfit, avoiding combinations already
   * present in recentKeys (BR-04). Falls back to best available if no
   * completely novel combination exists.
   */
  private selectItems(
    allItemIds: string[],
    recentKeys: Set<string>,
    minCount: number,
  ): string[] {
    // Try combinations of increasing size starting from minCount
    const n = allItemIds.length;

    // Generate combinations of `size` items and pick the first one not in recentKeys
    for (let size = minCount; size <= n; size++) {
      const combinations = this.combinations(allItemIds, size);
      for (const combo of combinations) {
        const key = outfitKey(combo);
        if (!recentKeys.has(key)) {
          return combo;
        }
      }
    }

    // All combinations exhausted — return minimum set (unavoidable repetition)
    return allItemIds.slice(0, minCount);
  }

  /**
   * Generate all combinations of `k` elements from `arr`.
   * Uses a generator to avoid materializing all combinations at once.
   */
  private *combinations(arr: string[], k: number): Generator<string[]> {
    if (k === 0) {
      yield [];
      return;
    }
    for (let i = 0; i <= arr.length - k; i++) {
      for (const rest of this.combinations(arr.slice(i + 1), k - 1)) {
        yield [arr[i], ...rest];
      }
    }
  }

  /**
   * Map a date to its Northern-Hemisphere season.
   * Used to filter items by season tag when calling ItemRepositoryPort.
   */
  private dateToSeason(isoDate: string): string {
    const month = parseInt(isoDate.slice(5, 7), 10);
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  }
}
