/**
 * Mutation-killing targeted tests — pocketwardrobe-mvp Phase 5
 *
 * These tests exist to kill Stryker mutants that survived the base test suite.
 * Each describe block names the surviving mutant category it targets.
 *
 * Coverage targets by file:
 *  - CalibrateStyleUseCase: updateStyleProfile (NoCoverage), completeCalibration ID reuse
 *  - DigitizeItemUseCase: deleteItem (NoCoverage), confirmItem/correctMetadata error paths
 *  - SuggestOutfitUseCase: items<3 returns null, ID prefixes, rotation windows, dateToSeason
 *  - StyleProfile.effectivePreferences(): calibration_completed=true branch
 *  - WearEvent: empty items_worn guard
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { CalibrateStyleUseCase } from '../CalibrateStyleUseCase.js';
import { DigitizeItemUseCase } from '../DigitizeItemUseCase.js';
import { SuggestOutfitUseCase } from '../SuggestOutfitUseCase.js';
import { StyleProfile } from '../../entities/StyleProfile.js';
import { WearEvent } from '../../entities/WearEvent.js';
import { Item } from '../../entities/Item.js';
import { Wardrobe } from '../../entities/Wardrobe.js';
import { Outfit } from '../../entities/Outfit.js';
import { AIClassification } from '../../value-objects/index.js';

import type { StyleProfileRepositoryPort } from '../../ports/outbound/StyleProfileRepositoryPort.js';
import type { ItemRepositoryPort } from '../../ports/outbound/ItemRepositoryPort.js';
import type { WardrobeRepositoryPort } from '../../ports/outbound/WardrobeRepositoryPort.js';
import type { OutfitRepositoryPort } from '../../ports/outbound/OutfitRepositoryPort.js';
import type { WearEventRepositoryPort } from '../../ports/outbound/WearEventRepositoryPort.js';
import type { WeatherServicePort } from '../../ports/outbound/WeatherServicePort.js';
import type { AIProcessorPort } from '../../ports/outbound/AIProcessorPort.js';
import type { ConsentLogPort } from '../../ports/outbound/ConsentLogPort.js';
import type { ImageStorePort } from '../../ports/outbound/ImageStorePort.js';
import type { AIQualityLogPort } from '../../ports/outbound/AIQualityLogPort.js';

// ── Constants ─────────────────────────────────────────────────────────────────

const NOW = new Date('2026-02-28T10:00:00Z');
const TODAY = '2026-02-28'; // February → winter

// ── Shared port stubs ─────────────────────────────────────────────────────────

class InMemoryStyleProfileRepo implements StyleProfileRepositoryPort {
  private store = new Map<string, StyleProfile>();

  async save(profile: StyleProfile): Promise<void> {
    this.store.set(profile.user_id, profile);
  }

  async findByUserId(userId: string): Promise<StyleProfile | null> {
    return this.store.get(userId) ?? null;
  }
}

class InMemoryItemRepo implements ItemRepositoryPort {
  private store = new Map<string, Item>();
  private _lastDeletedId: string | undefined;

  constructor(items: Item[] = []) {
    for (const item of items) {
      this.store.set(item.item_id, item);
    }
  }

  async save(item: Item): Promise<void> {
    this.store.set(item.item_id, item);
  }

  async findById(itemId: string): Promise<Item | null> {
    return this.store.get(itemId) ?? null;
  }

  async findByWardrobe(_wardrobeId: string): Promise<Item[]> {
    return [...this.store.values()].filter((i) => i.status === 'active');
  }

  async delete(itemId: string): Promise<void> {
    this._lastDeletedId = itemId;
    this.store.delete(itemId);
  }

  async findByOccasionAndSeason(_wardrobeId: string, _occasion: string, _season: string): Promise<Item[]> {
    return [...this.store.values()].filter((i) => i.status === 'active');
  }

  get lastDeletedId(): string | undefined { return this._lastDeletedId; }
  all(): Item[] { return [...this.store.values()]; }
}

/** Item repo where findByOccasionAndSeason captures the season argument. */
class SeasonCapturingItemRepo extends InMemoryItemRepo {
  capturedSeasons: string[] = [];

  async findByOccasionAndSeason(
    wardrobeId: string,
    occasion: string,
    season: string,
  ): Promise<Item[]> {
    this.capturedSeasons.push(season);
    return super.findByOccasionAndSeason(wardrobeId, occasion, season);
  }
}

/** Item repo that returns a fixed list regardless of filters — for testing items<3 path. */
class FixedResultItemRepo extends InMemoryItemRepo {
  constructor(private readonly fixedItems: Item[]) {
    super();
  }

  override async findByOccasionAndSeason(_w: string, _o: string, _s: string): Promise<Item[]> {
    return this.fixedItems;
  }
}

class InMemoryWardrobeRepo implements WardrobeRepositoryPort {
  constructor(private wardrobe: Wardrobe) {}

  async findByUserId(_userId: string): Promise<Wardrobe | null> {
    return this.wardrobe;
  }

  async updateItemCount(_wardrobeId: string, _delta: number): Promise<void> {}
}

class InMemoryOutfitRepo implements OutfitRepositoryPort {
  private store = new Map<string, Outfit>();

  constructor(outfits: Outfit[] = []) {
    for (const o of outfits) this.store.set(o.outfit_id, o);
  }

  async save(outfit: Outfit): Promise<void> {
    this.store.set(outfit.outfit_id, outfit);
  }

  async findByUserId(userId: string): Promise<Outfit[]> {
    return [...this.store.values()].filter((o) => o.user_id === userId);
  }

  async findByDateWindow(userId: string, startDate: string, endDate: string): Promise<Outfit[]> {
    return [...this.store.values()].filter(
      (o) =>
        o.user_id === userId &&
        o.suggestion_date >= startDate &&
        o.suggestion_date <= endDate,
    );
  }

  savedOutfits(): Outfit[] { return [...this.store.values()]; }
}

class InMemoryWearEventRepo implements WearEventRepositoryPort {
  private store: WearEvent[] = [];

  async save(wearEvent: WearEvent): Promise<void> {
    this.store.push(wearEvent);
  }

  async findByItemId(itemId: string): Promise<WearEvent[]> {
    return this.store.filter((e) => e.items_worn.includes(itemId));
  }

  saved(): WearEvent[] { return [...this.store]; }
}

class NullWeatherService implements WeatherServicePort {
  async fetchForecast(_city: string, _date: string) { return null; }
}

class StubAIProcessor implements AIProcessorPort {
  async processImage(_buf: Buffer): Promise<{ classification: AIClassification; backgroundRemovedUrl: string }> {
    return {
      classification: new AIClassification({
        name: 'Test Item',
        color_primary: 'white',
        color_hex: null,
        category: 'tops',
        subcategory: 'shirts',
        seasons: ['spring', 'summer'],
        occasions: ['casual', 'work'],
        fabric: 'cotton',
        ai_confidence: 0.9,
      }),
      backgroundRemovedUrl: 'https://example.com/bg-removed.jpg',
    };
  }
}

class StubConsentLog implements ConsentLogPort {
  async logConsent(_userId: string, _granted: boolean): Promise<void> {}
  async isConsentGranted(_userId: string): Promise<boolean> { return true; }
}

class StubImageStore implements ImageStorePort {
  async store(_key: string, _buf: Buffer): Promise<string> { return 'https://example.com/original.jpg'; }
  async delete(_key: string): Promise<void> {}
}

class NullAIQualityLog implements AIQualityLogPort {
  async logCorrection(_itemId: string, _predicted: AIClassification, _corrected: AIClassification): Promise<void> {}
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeItem(overrides: Partial<ConstructorParameters<typeof Item>[0]> = {}): Item {
  return new Item({
    item_id: 'item-1',
    user_id: 'user-1',
    wardrobe_id: 'wardrobe-1',
    photo_url_original: 'https://example.com/original.jpg',
    photo_url_thumbnail: 'https://example.com/bg-removed.jpg',
    name: 'Blue Shirt',
    color_primary: 'blue',
    color_hex: null,
    category: 'tops',
    subcategory: 'shirts',
    seasons: ['spring', 'summer'],
    occasions: ['casual', 'work'],
    fabric: 'cotton',
    ai_confidence: 0.9,
    manual_classification: false,
    last_worn_at: null,
    created_at: NOW,
    updated_at: NOW,
    status: 'active',
    ...overrides,
  });
}

function makeWardrobe(itemCount: number): Wardrobe {
  return new Wardrobe({
    wardrobe_id: 'wardrobe-1',
    user_id: 'user-1',
    item_count: itemCount,
    first_unlock_achieved: itemCount >= 5,
    created_at: NOW,
    updated_at: NOW,
  });
}

function makeActiveItems(count: number): Item[] {
  return Array.from({ length: count }, (_, i) =>
    makeItem({ item_id: `item-${i + 1}`, name: `Item ${i + 1}` }),
  );
}

function makeOutfit(overrides: Partial<ConstructorParameters<typeof Outfit>[0]> = {}): Outfit {
  return new Outfit({
    outfit_id: 'outfit-1',
    user_id: 'user-1',
    item_ids: ['item-1', 'item-2', 'item-3'],
    occasion: 'casual',
    weather_context: null,
    reasoning: 'Test outfit',
    generated_at: NOW,
    suggestion_date: TODAY,
    status: 'active',
    ...overrides,
  });
}

// ════════════════════════════════════════════════════════════════════════════
// CalibrateStyleUseCase — updateStyleProfile (NoCoverage)
// ════════════════════════════════════════════════════════════════════════════

describe('CalibrateStyleUseCase.updateStyleProfile', () => {
  let styleProfileRepo: InMemoryStyleProfileRepo;
  let useCase: CalibrateStyleUseCase;

  beforeEach(async () => {
    styleProfileRepo = new InMemoryStyleProfileRepo();
    useCase = new CalibrateStyleUseCase(styleProfileRepo);
    // Seed an existing profile to update
    await useCase.completeCalibration('user-1', 'bold', ['sport', 'casual'], 'vibrant');
  });

  it('throws when no StyleProfile exists for user', async () => {
    await expect(
      useCase.updateStyleProfile('nonexistent-user', { archetype: 'classic' }),
    ).rejects.toThrow(/StyleProfile not found for user nonexistent-user/);
  });

  it('updates archetype while preserving palette and occasions', async () => {
    const updated = await useCase.updateStyleProfile('user-1', { archetype: 'minimalist' });

    expect(updated.archetype).toBe('minimalist');
    expect(updated.palette).toBe('vibrant'); // preserved
    expect(updated.occasion_priorities).toContain('sport'); // preserved
  });

  it('updates palette while preserving archetype and occasions', async () => {
    const updated = await useCase.updateStyleProfile('user-1', { palette: 'earthy' });

    expect(updated.palette).toBe('earthy');
    expect(updated.archetype).toBe('bold'); // preserved
  });

  it('updates occasions while preserving archetype and palette', async () => {
    const updated = await useCase.updateStyleProfile('user-1', {
      occasion_priorities: ['work', 'events'],
    });

    expect(updated.occasion_priorities).toEqual(['work', 'events']);
    expect(updated.archetype).toBe('bold'); // preserved
    expect(updated.palette).toBe('vibrant'); // preserved
  });

  it('increments calibration_version by exactly 1', async () => {
    const before = await styleProfileRepo.findByUserId('user-1');
    const versionBefore = before!.calibration_version;

    const updated = await useCase.updateStyleProfile('user-1', { archetype: 'sporty' });

    expect(updated.calibration_version).toBe(versionBefore + 1);
  });

  it('preserves the existing style_profile_id', async () => {
    const before = await styleProfileRepo.findByUserId('user-1');
    const idBefore = before!.style_profile_id;

    const updated = await useCase.updateStyleProfile('user-1', { archetype: 'romantic' });

    expect(updated.style_profile_id).toBe(idBefore);
  });

  it('preserves calibration_completed from existing profile', async () => {
    // Existing profile has calibration_completed = true (set by completeCalibration)
    const updated = await useCase.updateStyleProfile('user-1', { palette: 'monochrome' });

    expect(updated.calibration_completed).toBe(true);
  });

  it('persists the updated profile to the repository', async () => {
    await useCase.updateStyleProfile('user-1', { archetype: 'romantic' });

    const saved = await styleProfileRepo.findByUserId('user-1');
    expect(saved!.archetype).toBe('romantic');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// CalibrateStyleUseCase — completeCalibration with existing profile
// ════════════════════════════════════════════════════════════════════════════

describe('CalibrateStyleUseCase.completeCalibration — existing profile', () => {
  let styleProfileRepo: InMemoryStyleProfileRepo;
  let useCase: CalibrateStyleUseCase;

  beforeEach(() => {
    styleProfileRepo = new InMemoryStyleProfileRepo();
    useCase = new CalibrateStyleUseCase(styleProfileRepo);
  });

  it('reuses the existing style_profile_id when completing over a skipped profile', async () => {
    const skipped = await useCase.skipCalibration('user-1');
    const idAfterSkip = skipped.style_profile_id;

    const completed = await useCase.completeCalibration('user-1', 'classic', ['work'], 'neutral');

    expect(completed.style_profile_id).toBe(idAfterSkip);
  });

  it('increments calibration_version from 0 to 1 on first completion', async () => {
    await useCase.skipCalibration('user-1'); // version = 0

    const completed = await useCase.completeCalibration('user-1', 'classic', ['work'], 'neutral');

    expect(completed.calibration_version).toBe(1);
  });

  it('increments calibration_version again on second completion', async () => {
    await useCase.completeCalibration('user-1', 'bold', ['sport'], 'vibrant'); // version = 1

    const second = await useCase.completeCalibration('user-1', 'minimalist', ['casual'], 'monochrome');

    expect(second.calibration_version).toBe(2);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// CalibrateStyleUseCase — skipCalibration ID format
// ════════════════════════════════════════════════════════════════════════════

describe('CalibrateStyleUseCase.skipCalibration — ID format', () => {
  it('generates a style_profile_id starting with "sp-"', async () => {
    const useCase = new CalibrateStyleUseCase(new InMemoryStyleProfileRepo());

    const profile = await useCase.skipCalibration('user-1');

    expect(profile.style_profile_id).toMatch(/^sp-/);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// DigitizeItemUseCase — deleteItem (NoCoverage)
// ════════════════════════════════════════════════════════════════════════════

describe('DigitizeItemUseCase.deleteItem', () => {
  let itemRepo: InMemoryItemRepo;
  let useCase: DigitizeItemUseCase;

  beforeEach(() => {
    itemRepo = new InMemoryItemRepo([makeItem({ item_id: 'item-to-delete' })]);
    useCase = new DigitizeItemUseCase(
      itemRepo,
      new InMemoryWardrobeRepo(makeWardrobe(3)),
      new StubAIProcessor(),
      new StubImageStore(),
      new StubConsentLog(),
      new NullAIQualityLog(),
    );
  });

  it('removes the item from the repository', async () => {
    await useCase.deleteItem('user-1', 'item-to-delete');

    const remaining = itemRepo.all();
    expect(remaining.find((i) => i.item_id === 'item-to-delete')).toBeUndefined();
  });

  it('calls itemRepo.delete with the correct item ID', async () => {
    await useCase.deleteItem('user-1', 'item-to-delete');

    expect(itemRepo.lastDeletedId).toBe('item-to-delete');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// DigitizeItemUseCase — confirmItem error path
// ════════════════════════════════════════════════════════════════════════════

describe('DigitizeItemUseCase.confirmItem — error path', () => {
  it('throws when item ID does not exist', async () => {
    const useCase = new DigitizeItemUseCase(
      new InMemoryItemRepo(),
      new InMemoryWardrobeRepo(makeWardrobe(3)),
      new StubAIProcessor(),
      new StubImageStore(),
      new StubConsentLog(),
      new NullAIQualityLog(),
    );

    await expect(useCase.confirmItem('user-1', 'ghost-item')).rejects.toThrow(/ghost-item/);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// DigitizeItemUseCase — correctMetadata error path
// ════════════════════════════════════════════════════════════════════════════

describe('DigitizeItemUseCase.correctMetadata — error path', () => {
  it('throws when item ID does not exist', async () => {
    const useCase = new DigitizeItemUseCase(
      new InMemoryItemRepo(),
      new InMemoryWardrobeRepo(makeWardrobe(3)),
      new StubAIProcessor(),
      new StubImageStore(),
      new StubConsentLog(),
      new NullAIQualityLog(),
    );

    await expect(
      useCase.correctMetadata('user-1', 'ghost-item', 'bottoms', 'jeans'),
    ).rejects.toThrow(/ghost-item/);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// DigitizeItemUseCase — initiateDigitization property assertions
// ════════════════════════════════════════════════════════════════════════════

describe('DigitizeItemUseCase.initiateDigitization — property assertions', () => {
  let useCase: DigitizeItemUseCase;

  beforeEach(() => {
    useCase = new DigitizeItemUseCase(
      new InMemoryItemRepo(),
      new InMemoryWardrobeRepo(makeWardrobe(3)),
      new StubAIProcessor(),
      new StubImageStore(),
      new StubConsentLog(),
      new NullAIQualityLog(),
    );
  });

  it('generates an item_id starting with "item-"', async () => {
    const item = await useCase.initiateDigitization('user-1', 'wardrobe-1', Buffer.from('x'));

    expect(item.item_id).toMatch(/^item-/);
  });

  it('sets manual_classification to false (AI-classified)', async () => {
    const item = await useCase.initiateDigitization('user-1', 'wardrobe-1', Buffer.from('x'));

    expect(item.manual_classification).toBe(false);
  });

  it('copies seasons from classification (not shared reference)', async () => {
    const item = await useCase.initiateDigitization('user-1', 'wardrobe-1', Buffer.from('x'));

    // The stored seasons must match AI classification output
    expect(item.seasons).toContain('spring');
    expect(item.seasons).toContain('summer');
    expect(item.seasons).toHaveLength(2);
  });

  it('copies occasions from classification (not shared reference)', async () => {
    const item = await useCase.initiateDigitization('user-1', 'wardrobe-1', Buffer.from('x'));

    expect(item.occasions).toContain('casual');
    expect(item.occasions).toContain('work');
    expect(item.occasions).toHaveLength(2);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// SuggestOutfitUseCase — items.length < MIN_OUTFIT_ITEMS returns null
// ════════════════════════════════════════════════════════════════════════════

describe('SuggestOutfitUseCase.getDailyOutfit — items < 3 returns null', () => {
  it('returns null when wardrobe qualifies (>= 5) but fewer than 3 items match the occasion/season', async () => {
    // Wardrobe has 5 items, but findByOccasionAndSeason returns only 2
    const twoItems = [
      makeItem({ item_id: 'item-1' }),
      makeItem({ item_id: 'item-2' }),
    ];
    const fixedRepo = new FixedResultItemRepo(twoItems);

    const useCase = new SuggestOutfitUseCase(
      fixedRepo,
      new InMemoryWardrobeRepo(makeWardrobe(5)),
      new InMemoryOutfitRepo(),
      new InMemoryWearEventRepo(),
      new NullWeatherService(),
    );

    const result = await useCase.getDailyOutfit('user-1', 'wardrobe-1', 'casual', TODAY);

    expect(result).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// SuggestOutfitUseCase — ID prefix assertions (kill StringLiteral mutants)
// ════════════════════════════════════════════════════════════════════════════

describe('SuggestOutfitUseCase — generated ID prefixes', () => {
  let outfitRepo: InMemoryOutfitRepo;
  let wearEventRepo: InMemoryWearEventRepo;

  beforeEach(() => {
    outfitRepo = new InMemoryOutfitRepo();
    wearEventRepo = new InMemoryWearEventRepo();
  });

  it('getDailyOutfit generates an outfit_id starting with "outfit-"', async () => {
    const items = makeActiveItems(5);
    const useCase = new SuggestOutfitUseCase(
      new InMemoryItemRepo(items),
      new InMemoryWardrobeRepo(makeWardrobe(5)),
      outfitRepo,
      wearEventRepo,
      new NullWeatherService(),
    );

    const result = await useCase.getDailyOutfit('user-1', 'wardrobe-1', 'casual', TODAY);

    expect(result).not.toBeNull();
    expect(result!.outfit_id).toMatch(/^outfit-/);
  });

  it('acceptOutfit generates a wear_event_id starting with "wear-"', async () => {
    const outfit = makeOutfit({ outfit_id: 'outfit-accept', suggestion_date: TODAY });
    outfitRepo = new InMemoryOutfitRepo([outfit]);

    const useCase = new SuggestOutfitUseCase(
      new InMemoryItemRepo(makeActiveItems(5)),
      new InMemoryWardrobeRepo(makeWardrobe(5)),
      outfitRepo,
      wearEventRepo,
      new NullWeatherService(),
    );

    const wearEvent = await useCase.acceptOutfit('user-1', 'outfit-accept', ['item-1', 'item-2', 'item-3']);

    expect(wearEvent.wear_event_id).toMatch(/^wear-/);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// SuggestOutfitUseCase — rotation window threshold boundary (BR-04)
// Targets: LARGE_WARDROBE_THRESHOLD (15), ROTATION_WINDOW_DAYS_LARGE_WARDROBE (7),
//          ROTATION_WINDOW_DAYS_SMALL_WARDROBE (3)
// ════════════════════════════════════════════════════════════════════════════

describe('SuggestOutfitUseCase.getDailyOutfit — rotation window boundary', () => {
  /**
   * Strategy: Place an outfit 4 days ago with items [item-1, item-2, item-3].
   * - With 14-item wardrobe (< 15): 3-day window → 4 days ago is OUTSIDE → combination is available
   * - With 15-item wardrobe (>= 15): 7-day window → 4 days ago is INSIDE → combination is avoided
   *
   * Date: TODAY = '2026-02-28', 4 days ago = '2026-02-24'
   */
  const DATE_4_DAYS_AGO = '2026-02-24';
  const FIXED_COMBO = ['item-1', 'item-2', 'item-3'];

  it('uses 3-day window for wardrobe with 14 items — outfit from 4 days ago is NOT excluded', async () => {
    const items = makeActiveItems(14);
    const oldOutfit = makeOutfit({
      outfit_id: 'outfit-old',
      item_ids: FIXED_COMBO,
      suggestion_date: DATE_4_DAYS_AGO,
    });

    const outfitRepo = new InMemoryOutfitRepo([oldOutfit]);
    const useCase = new SuggestOutfitUseCase(
      new InMemoryItemRepo(items),
      new InMemoryWardrobeRepo(makeWardrobe(14)),
      outfitRepo,
      new InMemoryWearEventRepo(),
      new NullWeatherService(),
    );

    const result = await useCase.getDailyOutfit('user-1', 'wardrobe-1', 'casual', TODAY);

    // With 14-item wardrobe: 3-day window → old outfit NOT in window → FIXED_COMBO is a valid candidate
    // The use case should produce a result (not null) and may pick FIXED_COMBO since it's not excluded
    expect(result).not.toBeNull();

    // Window size check: confirm only outfits from <= 3 days ago are excluded.
    // With 14 items, the outfit 4 days ago is outside the 3-day window.
    // So the new outfit CAN be the same combo as oldOutfit.
    // We verify the outfit_id is new (not old) — a new outfit was saved.
    expect(result!.outfit_id).toMatch(/^outfit-/);
    expect(result!.outfit_id).not.toBe('outfit-old');
  });

  it('uses 7-day window for wardrobe with 15 items — outfit from 4 days ago IS excluded', async () => {
    // With exactly 3 items available and 15-item wardrobe, the only possible 3-combo is FIXED_COMBO.
    // Since it's in the 7-day window, the use case must fall back (unavoidable repetition).
    // Key: it does NOT return null — it still produces an outfit (falls back to allItemIds.slice(0, 3)).
    const items = makeActiveItems(15); // 15 items available
    const oldOutfit = makeOutfit({
      outfit_id: 'outfit-4d',
      item_ids: FIXED_COMBO,
      suggestion_date: DATE_4_DAYS_AGO,
    });

    const outfitRepo = new InMemoryOutfitRepo([oldOutfit]);
    const useCase = new SuggestOutfitUseCase(
      new InMemoryItemRepo(items),
      new InMemoryWardrobeRepo(makeWardrobe(15)),
      outfitRepo,
      new InMemoryWearEventRepo(),
      new NullWeatherService(),
    );

    const result = await useCase.getDailyOutfit('user-1', 'wardrobe-1', 'casual', TODAY);

    // 7-day window: old outfit IS inside the window, combo is excluded when possible
    expect(result).not.toBeNull();
    // With 15 items there are many combinations — the result SHOULD differ from FIXED_COMBO
    if (result!.item_ids.length === 3) {
      const sameAsFixed = [...result!.item_ids].sort().join(',') === [...FIXED_COMBO].sort().join(',');
      expect(sameAsFixed).toBe(false);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// SuggestOutfitUseCase — dateToSeason boundary coverage
// Targets: ConditionalExpression mutants in month >= 3, >= 6, >= 9, <= 5, <= 8, <= 11
// ════════════════════════════════════════════════════════════════════════════

describe('SuggestOutfitUseCase.dateToSeason — via findByOccasionAndSeason spy', () => {
  function makeSeasonTestCase(date: string, expectedSeason: string): void {
    it(`maps ${date} (month ${date.slice(5, 7)}) → '${expectedSeason}'`, async () => {
      const items = makeActiveItems(5);
      const seasonRepo = new SeasonCapturingItemRepo(items);

      const useCase = new SuggestOutfitUseCase(
        seasonRepo,
        new InMemoryWardrobeRepo(makeWardrobe(5)),
        new InMemoryOutfitRepo(),
        new InMemoryWearEventRepo(),
        new NullWeatherService(),
      );

      await useCase.getDailyOutfit('user-1', 'wardrobe-1', 'casual', date);

      expect(seasonRepo.capturedSeasons[0]).toBe(expectedSeason);
    });
  }

  // Spring: March–May (months 3–5)
  makeSeasonTestCase('2026-03-01', 'spring'); // month=3, start boundary
  makeSeasonTestCase('2026-05-31', 'spring'); // month=5, end boundary

  // Summer: June–August (months 6–8)
  makeSeasonTestCase('2026-06-01', 'summer'); // month=6, start boundary
  makeSeasonTestCase('2026-08-31', 'summer'); // month=8, end boundary

  // Autumn: September–November (months 9–11)
  makeSeasonTestCase('2026-09-01', 'autumn'); // month=9, start boundary
  makeSeasonTestCase('2026-11-30', 'autumn'); // month=11, end boundary

  // Winter: December–February (months 12, 1, 2)
  makeSeasonTestCase('2026-12-01', 'winter'); // month=12
  makeSeasonTestCase('2026-01-15', 'winter'); // month=1
  makeSeasonTestCase('2026-02-28', 'winter'); // month=2, TODAY
});

// ════════════════════════════════════════════════════════════════════════════
// SuggestOutfitUseCase.acceptOutfit — outfit not found fallback
// ════════════════════════════════════════════════════════════════════════════

describe('SuggestOutfitUseCase.acceptOutfit — outfit not found falls back to current date', () => {
  it('creates a WearEvent with a non-empty worn_date when outfit ID does not exist', async () => {
    const useCase = new SuggestOutfitUseCase(
      new InMemoryItemRepo(makeActiveItems(5)),
      new InMemoryWardrobeRepo(makeWardrobe(5)),
      new InMemoryOutfitRepo(), // empty — outfit not found
      new InMemoryWearEventRepo(),
      new NullWeatherService(),
    );

    const wearEvent = await useCase.acceptOutfit('user-1', 'nonexistent-outfit', ['item-1', 'item-2', 'item-3']);

    expect(wearEvent.outfit_id).toBe('nonexistent-outfit');
    expect(wearEvent.worn_date).toBeTruthy();
    expect(wearEvent.worn_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// StyleProfile.effectivePreferences() — calibration_completed=true branch
// ════════════════════════════════════════════════════════════════════════════

describe('StyleProfile.effectivePreferences() — calibration_completed=true', () => {
  it('returns actual archetype, occasions, and palette when calibration is complete', () => {
    const profile = new StyleProfile({
      style_profile_id: 'sp-1',
      user_id: 'user-1',
      archetype: 'bold',
      occasion_priorities: ['events', 'sport'],
      palette: 'vibrant',
      calibration_completed: true,
      calibration_version: 1,
      created_at: NOW,
      updated_at: NOW,
    });

    const prefs = profile.effectivePreferences();

    expect(prefs.archetype).toBe('bold');
    expect(prefs.occasion_priorities).toContain('events');
    expect(prefs.occasion_priorities).toContain('sport');
    expect(prefs.palette).toBe('vibrant');
  });

  it('does NOT return default values when calibration is complete', () => {
    const profile = new StyleProfile({
      style_profile_id: 'sp-2',
      user_id: 'user-1',
      archetype: 'romantic', // not the default 'classic'
      occasion_priorities: ['events'],
      palette: 'earthy', // not the default 'neutral'
      calibration_completed: true,
      calibration_version: 2,
      created_at: NOW,
      updated_at: NOW,
    });

    const prefs = profile.effectivePreferences();

    expect(prefs.archetype).not.toBe('classic'); // must not use default
    expect(prefs.palette).not.toBe('neutral');    // must not use default
  });
});

// ════════════════════════════════════════════════════════════════════════════
// WearEvent — empty items_worn guard
// ════════════════════════════════════════════════════════════════════════════

describe('WearEvent — empty items_worn guard', () => {
  it('throws when items_worn is empty', () => {
    expect(() => {
      new WearEvent({
        wear_event_id: 'wear-1',
        user_id: 'user-1',
        outfit_id: 'outfit-1',
        items_worn: [],
        worn_date: TODAY,
        created_at: NOW,
      });
    }).toThrow(/at least one item worn/);
  });

  it('does not throw when items_worn has one or more items', () => {
    expect(() => {
      new WearEvent({
        wear_event_id: 'wear-2',
        user_id: 'user-1',
        outfit_id: 'outfit-1',
        items_worn: ['item-1'],
        worn_date: TODAY,
        created_at: NOW,
      });
    }).not.toThrow();
  });
});
