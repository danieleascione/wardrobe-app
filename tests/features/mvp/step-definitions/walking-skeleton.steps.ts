/**
 * Walking Skeleton step definitions — uses the DI container pattern directly.
 *
 * These steps exercise the full vertical slice:
 *   CalibrateStyleUseCase → DigitizeItemUseCase × 5 → SuggestOutfitUseCase
 *
 * All use cases are wired via constructor injection in WalkingSkeletonWorld.
 * No adapter implementations are imported here.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { WalkingSkeletonWorld } from './world.js';
import { AIClassification, WeatherContext } from '../../../../packages/domain/src/value-objects/index.js';

// ─── Background steps ─────────────────────────────────────────────────────────

Given(
  'Sofia is a new PocketWardrobe user',
  async function (this: WalkingSkeletonWorld) {
    // Fresh world — no profile, no items, wardrobe seeded empty by hooks.ts
  },
);

Given(
  'the AI image service returns accurate classifications',
  function (this: WalkingSkeletonWorld) {
    // MockAIProcessor is pre-configured in world constructor.
    // Each item step below overrides classification per garment.
  },
);

Given(
  'the weather service reports {int} degrees Celsius and partly cloudy in {word}',
  function (this: WalkingSkeletonWorld, tempCelsius: number, city: string) {
    this.weatherService.configure(
      new WeatherContext({
        city,
        date: new Date().toISOString().slice(0, 10),
        tempCelsius,
        condition: 'partly_cloudy',
      }),
    );
  },
);

// ─── Scenario steps ───────────────────────────────────────────────────────────

Given(
  'Sofia opens PocketWardrobe for the first time',
  async function (this: WalkingSkeletonWorld) {
    // New user state confirmed — wardrobe seeded with item_count = 0
    const existing = await this.styleProfileRepo.findByUserId(this.userId);
    assert.equal(existing, null, 'Expected no style profile on first launch');
  },
);

// ─── Style calibration ────────────────────────────────────────────────────────

When(
  'she selects {string} as her style archetype',
  function (this: WalkingSkeletonWorld, archetype: string) {
    this.state.lastStyleProfile = {
      ...(this.state.lastStyleProfile as object | undefined ?? {}),
      archetype,
    } as typeof this.state.lastStyleProfile;
  },
);

When(
  'she selects {string} and {string} as her occasion priorities',
  function (this: WalkingSkeletonWorld, occasion1: string, occasion2: string) {
    this.state.lastStyleProfile = {
      ...(this.state.lastStyleProfile as object | undefined ?? {}),
      occasion_priorities: [occasion1, occasion2],
    } as typeof this.state.lastStyleProfile;
  },
);

When(
  'she selects {string} as her colour preference',
  function (this: WalkingSkeletonWorld, palette: string) {
    this.state.lastStyleProfile = {
      ...(this.state.lastStyleProfile as object | undefined ?? {}),
      palette,
    } as typeof this.state.lastStyleProfile;
  },
);

When(
  'she confirms her style calibration',
  async function (this: WalkingSkeletonWorld) {
    const draft = this.state.lastStyleProfile as {
      archetype?: string;
      occasion_priorities?: string[];
      palette?: string;
    } | undefined;

    // Normalise to lowercase domain values:
    //   "Classic" → "classic", "Neutral palette" → "neutral"
    const rawArchetype = draft?.archetype ?? 'classic';
    const archetype = rawArchetype.toLowerCase().split(' ')[0];

    const rawPalette = draft?.palette ?? 'neutral';
    const palette = rawPalette.toLowerCase().split(' ')[0];

    const occasions = (draft?.occasion_priorities ?? ['work', 'casual']).map(
      (o) => o.toLowerCase(),
    );

    const profile = await this.calibrateStyleUseCase.completeCalibration(
      this.userId,
      archetype as 'classic' | 'minimalist' | 'bold' | 'sporty' | 'romantic',
      occasions,
      palette as 'neutral' | 'vibrant' | 'monochrome' | 'earthy',
    );
    this.state.lastStyleProfile = profile;
  },
);

Then(
  'her style profile is saved with archetype {string}, occasions {string}, and palette {string}',
  async function (
    this: WalkingSkeletonWorld,
    expectedArchetype: string,
    expectedOccasions: string,
    expectedPalette: string,
  ) {
    const profile = await this.styleProfileRepo.findByUserId(this.userId);
    assert.ok(profile, 'Expected a style profile to be saved');
    assert.equal(
      profile.archetype,
      expectedArchetype.toLowerCase(),
      `Expected archetype "${expectedArchetype}" but got "${profile.archetype}"`,
    );

    const occasionList = expectedOccasions
      .split(' and ')
      .map((o) => o.trim().toLowerCase());
    for (const occasion of occasionList) {
      assert.ok(
        profile.occasion_priorities.includes(occasion),
        `Expected occasion "${occasion}" in profile priorities [${profile.occasion_priorities.join(', ')}]`,
      );
    }

    assert.equal(
      profile.palette,
      expectedPalette.toLowerCase(),
      `Expected palette "${expectedPalette}" but got "${profile.palette}"`,
    );
  },
);

Then(
  'she is shown the item capture screen with a progress indicator reading {string}',
  async function (this: WalkingSkeletonWorld, expectedProgress: string) {
    const profile = this.state.lastStyleProfile;
    assert.ok(profile, 'Expected style profile to exist before progress screen');

    const match = expectedProgress.match(/(\d+) of 5/);
    if (match) {
      const items = await this.itemRepo.findByWardrobe(this.wardrobeId);
      const activeCount = items.filter((i) => i.status === 'active').length;
      assert.equal(
        activeCount,
        parseInt(match[1], 10),
        `Expected ${match[1]} active items but found ${activeCount}`,
      );
    }
  },
);

// ─── Item digitization ────────────────────────────────────────────────────────

const ITEM_CLASSIFICATIONS: Record<string, {
  name: string;
  category: string;
  subcategory: string;
  color_primary: string;
  occasions: string[];
}> = {
  'camel trench coat':     { name: 'Camel Trench Coat',     category: 'Outerwear', subcategory: 'Coat',     color_primary: 'Camel / Warm tan', occasions: ['work', 'casual'] },
  'white silk blouse':     { name: 'White Silk Blouse',     category: 'Tops',      subcategory: 'Blouse',   color_primary: 'White',            occasions: ['work', 'casual'] },
  'dark slim trousers':    { name: 'Dark Slim Trousers',    category: 'Bottoms',   subcategory: 'Trousers', color_primary: 'Dark navy',         occasions: ['work', 'casual'] },
  'ankle boots':           { name: 'Ankle Boots',           category: 'Footwear',  subcategory: 'Boots',    color_primary: 'Black',             occasions: ['work', 'casual'] },
  'camel knit turtleneck': { name: 'Camel Knit Turtleneck', category: 'Tops',      subcategory: 'Knitwear', color_primary: 'Camel',             occasions: ['work', 'casual'] },
};

When(
  'she photographs and confirms her {string}',
  async function (this: WalkingSkeletonWorld, itemName: string) {
    const itemKey = itemName.toLowerCase();
    const meta = ITEM_CLASSIFICATIONS[itemKey] ?? {
      name: itemName,
      category: 'Tops',
      subcategory: 'Top',
      color_primary: 'White',
      occasions: ['casual'],
    };

    // Configure AI processor for this specific garment
    this.aiProcessor.configure({
      classification: new AIClassification({
        name: meta.name,
        color_primary: meta.color_primary,
        color_hex: null,
        category: meta.category,
        subcategory: meta.subcategory,
        seasons: ['spring', 'autumn', 'winter'],
        occasions: meta.occasions,
        fabric: null,
        ai_confidence: 0.91,
      }),
      backgroundRemovedUrl: `https://in-memory-store.test/bg-removed/${itemKey.replace(/\s+/g, '-')}.webp`,
    });

    // Digitize via use case (consent pre-granted by hooks.ts)
    const item = await this.digitizeItemUseCase.initiateDigitization(
      this.userId,
      this.wardrobeId,
      Buffer.from(`photo-${itemKey}`),
    );

    // Confirm the item (transitions pending_ai → active)
    const confirmed = await this.digitizeItemUseCase.confirmItem(this.userId, item.item_id);

    this.state.lastItem = confirmed;
    this.state.confirmedItems.push(confirmed);

    // Sync wardrobe item_count to match confirmed active items
    await this.syncWardrobeItemCount();
  },
);

Then(
  'the progress indicator reads {string}',
  async function (this: WalkingSkeletonWorld, expectedText: string) {
    const match = expectedText.match(/(\d+) of 5/);
    if (match) {
      const expectedCount = parseInt(match[1], 10);
      const items = await this.itemRepo.findByWardrobe(this.wardrobeId);
      const activeCount = items.filter((i) => i.status === 'active').length;
      assert.equal(
        activeCount,
        expectedCount,
        `Expected progress ${expectedCount} of 5 but found ${activeCount} active items`,
      );
    }
  },
);

// ─── Outfit unlock celebration ────────────────────────────────────────────────

Then(
  'a celebration animation plays',
  async function (this: WalkingSkeletonWorld) {
    const items = await this.itemRepo.findByWardrobe(this.wardrobeId);
    const activeCount = items.filter((i) => i.status === 'active').length;
    assert.ok(
      activeCount >= 5,
      `Expected at least 5 items for celebration to trigger but found ${activeCount}`,
    );
  },
);

Then(
  'within {int} seconds she sees her first outfit suggestion',
  async function (this: WalkingSkeletonWorld, _seconds: number) {
    const today = new Date().toISOString().slice(0, 10);
    const outfit = await this.suggestOutfitUseCase.getDailyOutfit(
      this.userId,
      this.wardrobeId,
      'work',
      today,
    );
    this.state.lastOutfit = outfit;
    assert.ok(outfit, 'Expected an outfit suggestion to be returned');
  },
);

Then(
  'the outfit contains at least {int} items from her wardrobe',
  function (this: WalkingSkeletonWorld, minimumCount: number) {
    const outfit = this.state.lastOutfit;
    assert.ok(outfit, 'Expected an outfit suggestion');
    assert.ok(
      outfit.item_ids.length >= minimumCount,
      `Expected at least ${minimumCount} items in outfit but got ${outfit.item_ids.length}`,
    );
  },
);

Then(
  'the outfit card shows occasion label {string}',
  function (this: WalkingSkeletonWorld, expectedOccasion: string) {
    const outfit = this.state.lastOutfit;
    assert.ok(outfit, 'Expected an outfit suggestion');
    assert.equal(
      outfit.occasion.toLowerCase(),
      expectedOccasion.toLowerCase(),
      `Expected occasion "${expectedOccasion}" but got "${outfit.occasion}"`,
    );
  },
);

Then(
  'the outfit card shows weather context {string}',
  function (this: WalkingSkeletonWorld, expectedWeatherText: string) {
    const outfit = this.state.lastOutfit;
    assert.ok(outfit, 'Expected an outfit suggestion');
    assert.ok(
      outfit.weather_context,
      'Expected weather context to be present on the outfit card',
    );
    const weather = outfit.weather_context;
    assert.ok(
      expectedWeatherText.includes(weather.city),
      `Expected "${expectedWeatherText}" to contain city "${weather.city}"`,
    );
    assert.ok(
      expectedWeatherText.includes(String(weather.tempCelsius)),
      `Expected "${expectedWeatherText}" to contain temperature ${weather.tempCelsius}°C`,
    );
  },
);

Then(
  'she can accept the outfit as her choice for today',
  async function (this: WalkingSkeletonWorld) {
    const outfit = this.state.lastOutfit;
    assert.ok(outfit, 'Expected an outfit to be available for acceptance');

    const wearEvent = await this.suggestOutfitUseCase.acceptOutfit(
      this.userId,
      outfit.outfit_id,
      [...outfit.item_ids],
    );
    this.state.lastWearEvent = wearEvent;
    assert.ok(wearEvent, 'Expected a wear event to be created on acceptance');
    assert.ok(
      wearEvent.items_worn.length > 0,
      'Expected wear event to record at least one item',
    );
  },
);
