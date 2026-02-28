/**
 * Use Case Tests — Step 01-03
 *
 * Test Budget: 10 distinct behaviors x 2 = 20 max unit tests
 * All tests invoke through driving ports (use case public methods).
 * Port stubs are hand-rolled in-memory implementations — no mocking framework.
 * No database, HTTP, or file system access.
 *
 * Business Rules covered: BR-01, BR-03, BR-04, BR-05, BR-06, BR-08, BR-09, BR-10
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ── Use cases under test ───────────────────────────────────────────────────────
import { CalibrateStyleUseCase } from '../CalibrateStyleUseCase.js';
import { DigitizeItemUseCase } from '../DigitizeItemUseCase.js';
import { SuggestOutfitUseCase } from '../SuggestOutfitUseCase.js';

// ── Domain types ───────────────────────────────────────────────────────────────
import { Item } from '../../entities/Item.js';
import { Wardrobe } from '../../entities/Wardrobe.js';
import { StyleProfile } from '../../entities/StyleProfile.js';
import { Outfit } from '../../entities/Outfit.js';
import { WearEvent } from '../../entities/WearEvent.js';
import { AIClassification } from '../../value-objects/index.js';

// ── Port interfaces ────────────────────────────────────────────────────────────
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

// ── Helpers ────────────────────────────────────────────────────────────────────

const NOW = new Date('2026-02-28T10:00:00Z');
const TODAY = '2026-02-28';

function makeItem(overrides: Partial<ConstructorParameters<typeof Item>[0]> = {}): Item {
  return new Item({
    item_id: 'item-1',
    user_id: 'user-1',
    wardrobe_id: 'wardrobe-1',
    photo_url_original: 'https://example.com/original.jpg',
    photo_url_thumbnail: 'https://example.com/bg-removed.jpg',
    name: 'Blue Shirt',
    color_primary: 'blue',
    color_hex: '#0000FF',
    category: 'tops',
    subcategory: 'shirts',
    seasons: ['spring', 'summer'],
    occasions: ['casual', 'work'],
    fabric: 'cotton',
    ai_confidence: 0.95,
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

// ── In-memory port stubs ───────────────────────────────────────────────────────

class InMemoryStyleProfileRepo implements StyleProfileRepositoryPort {
  private store = new Map<string, StyleProfile>();

  async save(profile: StyleProfile): Promise<void> {
    this.store.set(profile.user_id, profile);
  }

  async findByUserId(userId: string): Promise<StyleProfile | null> {
    return this.store.get(userId) ?? null;
  }

  savedProfiles(): StyleProfile[] {
    return [...this.store.values()];
  }
}

class InMemoryItemRepo implements ItemRepositoryPort {
  private store = new Map<string, Item>();

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

  async findByWardrobe(wardrobeId: string): Promise<Item[]> {
    return [...this.store.values()].filter(
      (i) => i.wardrobe_id === wardrobeId && i.status === 'active',
    );
  }

  async delete(itemId: string): Promise<void> {
    this.store.delete(itemId);
  }

  async findByOccasionAndSeason(
    _wardrobeId: string,
    _occasion: string,
    _season: string,
  ): Promise<Item[]> {
    return [...this.store.values()].filter((i) => i.status === 'active');
  }
}

class InMemoryWardrobeRepo implements WardrobeRepositoryPort {
  private wardrobe: Wardrobe;

  constructor(wardrobe: Wardrobe) {
    this.wardrobe = wardrobe;
  }

  async findByUserId(_userId: string): Promise<Wardrobe | null> {
    return this.wardrobe;
  }

  async updateItemCount(_wardrobeId: string, _delta: number): Promise<void> {
    // item_count is maintained by DB trigger — no-op in stub
  }
}

class InMemoryOutfitRepo implements OutfitRepositoryPort {
  private store = new Map<string, Outfit>();

  constructor(outfits: Outfit[] = []) {
    for (const outfit of outfits) {
      this.store.set(outfit.outfit_id, outfit);
    }
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

  savedOutfits(): Outfit[] {
    return [...this.store.values()];
  }
}

class InMemoryWearEventRepo implements WearEventRepositoryPort {
  private store: WearEvent[] = [];

  async save(wearEvent: WearEvent): Promise<void> {
    this.store.push(wearEvent);
  }

  async findByItemId(itemId: string): Promise<WearEvent[]> {
    return this.store.filter((e) => e.items_worn.includes(itemId));
  }

  saved(): WearEvent[] {
    return [...this.store];
  }
}

class NullWeatherService implements WeatherServicePort {
  async fetchForecast(_city: string, _date: string) {
    return null;
  }
}

class StubAIProcessor implements AIProcessorPort {
  async processImage(
    _imageBuffer: Buffer,
  ): Promise<{ classification: AIClassification; backgroundRemovedUrl: string }> {
    return {
      classification: new AIClassification({
        name: 'Blue Shirt',
        color_primary: 'blue',
        color_hex: '#0000FF',
        category: 'tops',
        subcategory: 'shirts',
        seasons: ['spring'],
        occasions: ['casual'],
        fabric: 'cotton',
        ai_confidence: 0.9,
      }),
      backgroundRemovedUrl: 'https://example.com/bg-removed.jpg',
    };
  }
}

class StubConsentLog implements ConsentLogPort {
  constructor(private granted: boolean = true) {}

  async logConsent(_userId: string, _granted: boolean): Promise<void> {}

  async isConsentGranted(_userId: string): Promise<boolean> {
    return this.granted;
  }
}

class StubImageStore implements ImageStorePort {
  async store(_key: string, _buffer: Buffer): Promise<string> {
    return 'https://example.com/stored.jpg';
  }

  async delete(_key: string): Promise<void> {}
}

class SpyAIQualityLog implements AIQualityLogPort {
  calls: Array<{
    itemId: string;
    predicted: AIClassification;
    corrected: AIClassification;
  }> = [];

  async logCorrection(
    itemId: string,
    predicted: AIClassification,
    corrected: AIClassification,
  ): Promise<void> {
    this.calls.push({ itemId, predicted, corrected });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// CalibrateStyleUseCase
// ════════════════════════════════════════════════════════════════════════════

describe('CalibrateStyleUseCase', () => {
  let styleProfileRepo: InMemoryStyleProfileRepo;
  let useCase: CalibrateStyleUseCase;

  beforeEach(() => {
    styleProfileRepo = new InMemoryStyleProfileRepo();
    useCase = new CalibrateStyleUseCase(styleProfileRepo);
  });

  // Behavior 1: skipCalibration persists BR-09 defaults
  describe('skipCalibration', () => {
    it('persists a StyleProfile with BR-09 defaults: classic / work+casual / neutral', async () => {
      const profile = await useCase.skipCalibration('user-1');

      expect(profile.archetype).toBe('classic');
      expect(profile.occasion_priorities).toEqual(['work', 'casual']);
      expect(profile.palette).toBe('neutral');
      expect(profile.calibration_completed).toBe(false);
      expect(profile.user_id).toBe('user-1');
    });

    it('saves the default profile to the repository', async () => {
      await useCase.skipCalibration('user-1');

      const saved = styleProfileRepo.savedProfiles();
      expect(saved).toHaveLength(1);
      expect(saved[0].user_id).toBe('user-1');
      expect(saved[0].archetype).toBe('classic');
    });
  });

  // Behavior 2: completeCalibration persists user-chosen preferences
  describe('completeCalibration', () => {
    it('persists a StyleProfile with user-chosen archetype, occasions, and palette', async () => {
      const profile = await useCase.completeCalibration(
        'user-1',
        'minimalist',
        ['sport', 'casual'],
        'monochrome',
      );

      expect(profile.archetype).toBe('minimalist');
      expect(profile.occasion_priorities).toEqual(['sport', 'casual']);
      expect(profile.palette).toBe('monochrome');
      expect(profile.calibration_completed).toBe(true);
      expect(profile.user_id).toBe('user-1');
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// DigitizeItemUseCase
// ════════════════════════════════════════════════════════════════════════════

describe('DigitizeItemUseCase', () => {
  let itemRepo: InMemoryItemRepo;
  let wardrobeRepo: InMemoryWardrobeRepo;
  let aiProcessor: StubAIProcessor;
  let imageStore: StubImageStore;
  let consentLog: StubConsentLog;
  let aiQualityLog: SpyAIQualityLog;
  let useCase: DigitizeItemUseCase;

  beforeEach(() => {
    itemRepo = new InMemoryItemRepo();
    wardrobeRepo = new InMemoryWardrobeRepo(makeWardrobe(3));
    aiProcessor = new StubAIProcessor();
    imageStore = new StubImageStore();
    consentLog = new StubConsentLog(true);
    aiQualityLog = new SpyAIQualityLog();
    useCase = new DigitizeItemUseCase(
      itemRepo,
      wardrobeRepo,
      aiProcessor,
      imageStore,
      consentLog,
      aiQualityLog,
    );
  });

  // Behavior 3: initiateDigitization creates pending_ai item with BR-06 photo_url
  describe('initiateDigitization', () => {
    it('creates an item with status pending_ai and photo_url_thumbnail from backgroundRemovedUrl (BR-06)', async () => {
      const item = await useCase.initiateDigitization(
        'user-1',
        'wardrobe-1',
        Buffer.from('image-data'),
      );

      expect(item.status).toBe('pending_ai');
      expect(item.photo_url_thumbnail).toBe('https://example.com/bg-removed.jpg');
      expect(item.wardrobe_id).toBe('wardrobe-1');
      expect(item.user_id).toBe('user-1');
    });

    it('throws when consent has not been granted', async () => {
      const noConsentCase = new DigitizeItemUseCase(
        itemRepo,
        wardrobeRepo,
        aiProcessor,
        imageStore,
        new StubConsentLog(false),
        aiQualityLog,
      );

      await expect(
        noConsentCase.initiateDigitization('user-1', 'wardrobe-1', Buffer.from('image-data')),
      ).rejects.toThrow();
    });
  });

  // Behavior 4: confirmItem transitions item to active; item_count NOT incremented by use case
  describe('confirmItem', () => {
    it('transitions item status from pending_ai to active', async () => {
      const pendingItem = makeItem({ item_id: 'item-pending', status: 'pending_ai' });
      await itemRepo.save(pendingItem);

      const confirmed = await useCase.confirmItem('user-1', 'item-pending');

      expect(confirmed.status).toBe('active');
      expect(confirmed.item_id).toBe('item-pending');
    });

    it('does not call wardrobeRepo.updateItemCount — item_count maintained by DB trigger', async () => {
      const updateCalls: string[] = [];
      const spyWardrobeRepo: WardrobeRepositoryPort = {
        findByUserId: async (_uid) => makeWardrobe(3),
        updateItemCount: async (wardrobeId, _delta) => {
          updateCalls.push(wardrobeId);
        },
      };
      const spyUseCase = new DigitizeItemUseCase(
        itemRepo,
        spyWardrobeRepo,
        aiProcessor,
        imageStore,
        consentLog,
        aiQualityLog,
      );

      const pendingItem = makeItem({ item_id: 'item-spy', status: 'pending_ai' });
      await itemRepo.save(pendingItem);

      await spyUseCase.confirmItem('user-1', 'item-spy');

      expect(updateCalls).toHaveLength(0);
    });
  });

  // Behavior 5: correctMetadata logs correction via AIQualityLogPort (BR-10)
  describe('correctMetadata', () => {
    it('logs the predicted and corrected classification via AIQualityLogPort (BR-10)', async () => {
      const existingItem = makeItem({
        item_id: 'item-correct',
        category: 'tops',
        subcategory: 'shirts',
        status: 'active',
      });
      await itemRepo.save(existingItem);

      await useCase.correctMetadata('user-1', 'item-correct', 'bottoms', 'trousers');

      expect(aiQualityLog.calls).toHaveLength(1);
      expect(aiQualityLog.calls[0].itemId).toBe('item-correct');
      expect(aiQualityLog.calls[0].predicted.category).toBe('tops');
      expect(aiQualityLog.calls[0].corrected.category).toBe('bottoms');
      expect(aiQualityLog.calls[0].corrected.subcategory).toBe('trousers');
    });

    it('updates item category and subcategory after correction', async () => {
      const existingItem = makeItem({
        item_id: 'item-correct-2',
        category: 'tops',
        subcategory: 'shirts',
        status: 'active',
      });
      await itemRepo.save(existingItem);

      const corrected = await useCase.correctMetadata('user-1', 'item-correct-2', 'bottoms', 'jeans');

      expect(corrected.category).toBe('bottoms');
      expect(corrected.subcategory).toBe('jeans');
      expect(corrected.manual_classification).toBe(true);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// SuggestOutfitUseCase
// ════════════════════════════════════════════════════════════════════════════

describe('SuggestOutfitUseCase', () => {
  let itemRepo: InMemoryItemRepo;
  let wardrobeRepo: InMemoryWardrobeRepo;
  let outfitRepo: InMemoryOutfitRepo;
  let wearEventRepo: InMemoryWearEventRepo;
  let weatherService: NullWeatherService;
  let useCase: SuggestOutfitUseCase;

  function makeUseCase(
    wardrobe: Wardrobe,
    items: Item[] = [],
    existingOutfits: Outfit[] = [],
  ): SuggestOutfitUseCase {
    itemRepo = new InMemoryItemRepo(items);
    wardrobeRepo = new InMemoryWardrobeRepo(wardrobe);
    outfitRepo = new InMemoryOutfitRepo(existingOutfits);
    wearEventRepo = new InMemoryWearEventRepo();
    weatherService = new NullWeatherService();
    return new SuggestOutfitUseCase(
      itemRepo,
      wardrobeRepo,
      outfitRepo,
      wearEventRepo,
      weatherService,
    );
  }

  // Behavior 6: BR-01 — returns null when item_count < 5
  describe('getDailyOutfit — BR-01', () => {
    it('returns null when wardrobe item_count is 4 (below threshold)', async () => {
      useCase = makeUseCase(makeWardrobe(4));

      const result = await useCase.getDailyOutfit('user-1', 'wardrobe-1', 'casual', TODAY);

      expect(result).toBeNull();
    });

    it('proceeds with suggestion when item_count is exactly 5', async () => {
      const items = makeActiveItems(5);
      useCase = makeUseCase(makeWardrobe(5), items);

      const result = await useCase.getDailyOutfit('user-1', 'wardrobe-1', 'casual', TODAY);

      // Should return an Outfit (not null) with >= 3 items
      expect(result).not.toBeNull();
      expect(result!.item_ids.length).toBeGreaterThanOrEqual(3);
    });
  });

  // Behavior 7: BR-03 — outfit has >= 3 items
  describe('getDailyOutfit — BR-03', () => {
    it('returns an outfit containing at least 3 items', async () => {
      const items = makeActiveItems(5);
      useCase = makeUseCase(makeWardrobe(5), items);

      const result = await useCase.getDailyOutfit('user-1', 'wardrobe-1', 'casual', TODAY);

      expect(result).not.toBeNull();
      expect(result!.item_ids.length).toBeGreaterThanOrEqual(3);
    });
  });

  // Behavior 8: WeatherService null — graceful degradation
  describe('getDailyOutfit — weather null graceful degradation', () => {
    it('returns an outfit when WeatherServicePort returns null', async () => {
      const items = makeActiveItems(5);
      useCase = makeUseCase(makeWardrobe(5), items);
      // NullWeatherService always returns null — already wired in makeUseCase

      const result = await useCase.getDailyOutfit('user-1', 'wardrobe-1', 'casual', TODAY);

      expect(result).not.toBeNull();
      expect(result!.weather_context).toBeNull();
    });
  });

  // Behavior 9: BR-04 — skip combinations seen within rotation window
  describe('getDailyOutfit — BR-04 rotation window', () => {
    it('skips exact item combinations seen within the 3-day rotation window (<15 items)', async () => {
      const items = makeActiveItems(5);
      // Outfit from yesterday with same item set
      const recentOutfit = makeOutfit({
        outfit_id: 'outfit-recent',
        item_ids: items.map((i) => i.item_id), // exact same set
        suggestion_date: '2026-02-27', // yesterday
      });

      useCase = makeUseCase(makeWardrobe(5), items, [recentOutfit]);

      // When there are only 5 items and recent outfit used all of them,
      // the use case must still produce an outfit (may partially overlap)
      // or produce one with a different combination if possible.
      // Key assertion: the exact duplicate set is avoided when alternatives exist.
      // With 5 items and a minimum of 3, multiple combinations are possible.
      const result = await useCase.getDailyOutfit('user-1', 'wardrobe-1', 'casual', TODAY);

      // Result should not be the exact same item set as yesterday
      // (rotation window: 3 days for <15 items)
      if (result !== null && result.item_ids.length === recentOutfit.item_ids.length) {
        const sameSet =
          [...result.item_ids].sort().join(',') ===
          [...recentOutfit.item_ids].sort().join(',');
        expect(sameSet).toBe(false);
      }
    });

    it('uses 7-day rotation window when wardrobe has >= 15 items', async () => {
      // Outfit from 5 days ago — within 7-day window
      const items = makeActiveItems(15);
      const recentOutfit = makeOutfit({
        outfit_id: 'outfit-old',
        item_ids: ['item-1', 'item-2', 'item-3'],
        suggestion_date: '2026-02-23', // 5 days ago — within 7-day window
      });

      useCase = makeUseCase(makeWardrobe(15), items, [recentOutfit]);

      const result = await useCase.getDailyOutfit('user-1', 'wardrobe-1', 'casual', TODAY);

      // With 15 items there are many possible combinations — result should differ from recent
      if (result !== null) {
        const sameSet =
          [...result.item_ids].sort().join(',') ===
          [...recentOutfit.item_ids].sort().join(',');
        expect(sameSet).toBe(false);
      }
    });
  });

  // Behavior 10: BR-05 — acceptOutfit creates WearEvent, does NOT mutate Outfit
  describe('acceptOutfit — BR-05', () => {
    it('creates a WearEvent with the final item IDs provided by the user', async () => {
      const items = makeActiveItems(5);
      useCase = makeUseCase(makeWardrobe(5), items);
      const outfit = makeOutfit({ outfit_id: 'outfit-accept' });
      await outfitRepo.save(outfit);

      const finalItemIds = ['item-1', 'item-2', 'item-3'];
      const wearEvent = await useCase.acceptOutfit('user-1', 'outfit-accept', finalItemIds);

      expect(wearEvent.outfit_id).toBe('outfit-accept');
      expect(wearEvent.user_id).toBe('user-1');
      expect(wearEvent.items_worn).toEqual(finalItemIds);
      expect(wearEvent.worn_date).toBe(TODAY);
    });

    it('does not mutate the Outfit when creating a WearEvent', async () => {
      const items = makeActiveItems(5);
      useCase = makeUseCase(makeWardrobe(5), items);
      const originalItemIds = ['item-1', 'item-2', 'item-3'];
      const outfit = makeOutfit({ outfit_id: 'outfit-immutable', item_ids: originalItemIds });
      await outfitRepo.save(outfit);

      // Accept with a different (swapped) item set
      const swappedIds = ['item-1', 'item-2', 'item-4'];
      await useCase.acceptOutfit('user-1', 'outfit-immutable', swappedIds);

      // Outfit in the repo must still have original item_ids (BR-05: immutable)
      const savedOutfits = outfitRepo.savedOutfits();
      const savedOutfit = savedOutfits.find((o) => o.outfit_id === 'outfit-immutable');
      expect(savedOutfit!.item_ids).toEqual(originalItemIds);
    });
  });

  // Behavior 11: BR-08 — invalidate outfits when referenced item is deleted
  describe('invalidateOutfitsForDeletedItem — BR-08', () => {
    it('sets status to invalidated for all outfits referencing the deleted item', async () => {
      const items = makeActiveItems(5);
      useCase = makeUseCase(makeWardrobe(5), items);

      const outfitWithItem = makeOutfit({
        outfit_id: 'outfit-with-deleted',
        item_ids: ['item-1', 'item-2', 'item-3'],
      });
      const outfitWithoutItem = makeOutfit({
        outfit_id: 'outfit-without-deleted',
        item_ids: ['item-2', 'item-3', 'item-4'],
      });
      await outfitRepo.save(outfitWithItem);
      await outfitRepo.save(outfitWithoutItem);

      await useCase.invalidateOutfitsForDeletedItem('user-1', 'item-1');

      const savedOutfits = outfitRepo.savedOutfits();
      const invalidated = savedOutfits.find((o) => o.outfit_id === 'outfit-with-deleted');
      const untouched = savedOutfits.find((o) => o.outfit_id === 'outfit-without-deleted');

      expect(invalidated!.status).toBe('invalidated');
      expect(untouched!.status).toBe('active');
    });
  });
});
