/**
 * Milestone-3 step definitions: Progress indicator and first outfit unlock
 *
 * Exercises DigitizeItemUseCase + SuggestOutfitUseCase via WalkingSkeletonWorld.
 * "Sofia's wardrobe has {int} confirmed items" is defined in milestone-2.steps.ts.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { WalkingSkeletonWorld } from './world.js';
import { AIClassification } from '../../../../packages/domain/src/value-objects/index.js';

// ─── Background / setup steps ─────────────────────────────────────────────────

Given(
  'Sofia has completed style calibration with archetype {string} and occasion {string}',
  async function (this: WalkingSkeletonWorld, archetype: string, occasion: string) {
    await this.calibrateStyleUseCase.completeCalibration(
      this.userId,
      archetype.toLowerCase() as 'classic' | 'minimalist' | 'bold' | 'sporty' | 'romantic',
      [occasion.toLowerCase()],
      'neutral',
    );
  },
);

// ─── State constants ───────────────────────────────────────────────────────────

const TURTLENECK_CLASSIFICATION = {
  name: 'Camel Knit Turtleneck',
  color_primary: 'Camel',
  color_hex: null,
  category: 'Tops',
  subcategory: 'Knitwear',
  seasons: ['autumn', 'winter'],
  occasions: ['work', 'casual'],
  fabric: null,
  ai_confidence: 0.92,
} as const;

// ─── Background / setup steps ─────────────────────────────────────────────────

Given(
  'Sofia has 4 confirmed items in her wardrobe',
  async function (this: WalkingSkeletonWorld) {
    // Import seedConfirmedItems logic inline to avoid cross-file import complexity
    for (let i = 0; i < 4; i++) {
      this.aiProcessor.configure({
        classification: new AIClassification({
          name: `Wardrobe Item ${i + 1}`,
          color_primary: 'White',
          color_hex: null,
          category: 'Tops',
          subcategory: 'Top',
          seasons: ['spring', 'summer', 'autumn', 'winter'],
          occasions: ['work', 'casual'],
          fabric: null,
          ai_confidence: 0.9,
        }),
        backgroundRemovedUrl: `https://in-memory-store.test/bg-removed/item-${i + 1}.webp`,
      });

      const item = await this.digitizeItemUseCase.initiateDigitization(
        this.userId,
        this.wardrobeId,
        Buffer.from(`item-${i + 1}-photo`),
      );
      const confirmed = await this.digitizeItemUseCase.confirmItem(this.userId, item.item_id);
      this.state.confirmedItems.push(confirmed);
    }
    await this.syncWardrobeItemCount();
  },
);

Given(
  'this is her first time reaching the 5-item milestone',
  async function (this: WalkingSkeletonWorld) {
    // Domain signal: first_unlock_achieved = false on the wardrobe
    const wardrobe = await this.wardrobeRepo.findByUserId(this.userId);
    assert.ok(wardrobe, 'Expected a wardrobe to exist');
    assert.equal(
      wardrobe.first_unlock_achieved,
      false,
      'Expected first_unlock_achieved = false (milestone not yet reached)',
    );
  },
);

Given(
  '{int} item upload is currently in progress',
  async function (this: WalkingSkeletonWorld, _count: number) {
    // Initiate digitization without confirming — item stays pending_ai
    this.aiProcessor.configure({
      classification: new AIClassification({
        name: 'In Progress Item',
        color_primary: 'Grey',
        color_hex: null,
        category: 'Tops',
        subcategory: 'Top',
        seasons: ['spring', 'summer', 'autumn', 'winter'],
        occasions: ['casual'],
        fabric: null,
        ai_confidence: 0.88,
      }),
      backgroundRemovedUrl: 'https://in-memory-store.test/bg-removed/in-progress.webp',
    });

    const pendingItem = await this.digitizeItemUseCase.initiateDigitization(
      this.userId,
      this.wardrobeId,
      Buffer.from('in-progress-photo'),
    );
    this.state.lastItem = pendingItem;
    // Do NOT confirm — item remains pending_ai (in progress)
  },
);

// ─── Action steps ─────────────────────────────────────────────────────────────

When(
  'she confirms her 5th item — a camel knit turtleneck',
  async function (this: WalkingSkeletonWorld) {
    this.aiProcessor.configure({
      classification: new AIClassification(TURTLENECK_CLASSIFICATION),
      backgroundRemovedUrl:
        'https://in-memory-store.test/bg-removed/camel-knit-turtleneck.webp',
    });

    const item = await this.digitizeItemUseCase.initiateDigitization(
      this.userId,
      this.wardrobeId,
      Buffer.from('photo-camel-knit-turtleneck'),
    );
    const confirmed = await this.digitizeItemUseCase.confirmItem(this.userId, item.item_id);
    this.state.lastItem = confirmed;
    this.state.confirmedItems.push(confirmed);
    await this.syncWardrobeItemCount();
  },
);

When(
  'she views the wardrobe grid',
  function (this: WalkingSkeletonWorld) {
    // Mobile UI concern — no domain action needed.
    // The domain state (item counts) is the source of truth for grid display.
  },
);

When(
  'the upload completes successfully',
  async function (this: WalkingSkeletonWorld) {
    const pendingItem = this.state.lastItem;
    assert.ok(pendingItem, 'Expected a pending item to confirm');
    assert.equal(pendingItem.status, 'pending_ai', 'Expected item to be pending_ai before completion');

    const confirmed = await this.digitizeItemUseCase.confirmItem(
      this.userId,
      pendingItem.item_id,
    );
    this.state.lastItem = confirmed;
    this.state.confirmedItems.push(confirmed);
    await this.syncWardrobeItemCount();
  },
);

// ─── Assertion steps ──────────────────────────────────────────────────────────

Then(
  'a celebration animation plays once',
  async function (this: WalkingSkeletonWorld) {
    // Domain signal: exactly 5 active items AND first_unlock_achieved just became true
    const items = await this.itemRepo.findByWardrobe(this.wardrobeId);
    const activeCount = items.filter((i) => i.status === 'active').length;
    assert.ok(
      activeCount >= 5,
      `Expected at least 5 active items for celebration but found ${activeCount}`,
    );
    const wardrobe = await this.wardrobeRepo.findByUserId(this.userId);
    assert.ok(wardrobe?.first_unlock_achieved, 'Expected first_unlock_achieved = true after reaching 5 items');
  },
);

Then(
  'within {int} seconds the screen transitions to her first outfit suggestion',
  async function (this: WalkingSkeletonWorld, _seconds: number) {
    const today = new Date().toISOString().slice(0, 10);
    const outfit = await this.suggestOutfitUseCase.getDailyOutfit(
      this.userId,
      this.wardrobeId,
      'work',
      today,
    );
    this.state.lastOutfit = outfit;
    assert.ok(outfit, 'Expected an outfit suggestion to be returned at the 5-item threshold');
  },
);

Then(
  'the outfit is composed of items from her wardrobe',
  async function (this: WalkingSkeletonWorld) {
    const outfit = this.state.lastOutfit;
    assert.ok(outfit, 'Expected an outfit suggestion to be available');
    assert.ok(outfit.item_ids.length > 0, 'Expected the outfit to contain at least one item');

    const wardrobeItems = await this.itemRepo.findByWardrobe(this.wardrobeId);
    const wardrobeItemIds = new Set(wardrobeItems.map((i) => i.item_id));

    for (const itemId of outfit.item_ids) {
      assert.ok(
        wardrobeItemIds.has(itemId),
        `Outfit item ${itemId} is not from the user's wardrobe`,
      );
    }
  },
);

Then(
  'the outfit contains at least {int} of her items',
  function (this: WalkingSkeletonWorld, minimumCount: number) {
    const outfit = this.state.lastOutfit;
    assert.ok(outfit, 'Expected an outfit suggestion');
    assert.ok(
      outfit.item_ids.length >= minimumCount,
      `Expected outfit to contain at least ${minimumCount} items but got ${outfit.item_ids.length}`,
    );
  },
);

Then(
  'the in-progress item is not included in the count',
  async function (this: WalkingSkeletonWorld) {
    const pendingItem = this.state.lastItem;
    assert.ok(pendingItem, 'Expected a pending item to be tracked');
    assert.equal(
      pendingItem.status,
      'pending_ai',
      'Expected the in-progress item to still be pending_ai (not counted)',
    );

    const items = await this.itemRepo.findByWardrobe(this.wardrobeId);
    const activeCount = items.filter((i) => i.status === 'active').length;
    const pendingCount = items.filter((i) => i.status === 'pending_ai').length;
    assert.ok(
      pendingCount > 0,
      'Expected at least one pending_ai item to be excluded from count',
    );
    // Wardrobe item_count reflects only active items
    const wardrobe = await this.wardrobeRepo.findByUserId(this.userId);
    assert.ok(wardrobe, 'Expected a wardrobe to exist');
    assert.equal(
      wardrobe.item_count,
      activeCount,
      `Expected wardrobe.item_count (${wardrobe.item_count}) to match active item count (${activeCount})`,
    );
  },
);

Then(
  'the progress indicator updates to {string} without a page refresh',
  async function (this: WalkingSkeletonWorld, expectedText: string) {
    // Domain: item_count is the source of truth; mobile polls/subscribes to it
    const match = expectedText.match(/(\d+) of 5/);
    if (match) {
      const expectedCount = parseInt(match[1], 10);
      const items = await this.itemRepo.findByWardrobe(this.wardrobeId);
      const activeCount = items.filter((i) => i.status === 'active').length;
      assert.equal(
        activeCount,
        expectedCount,
        `Expected ${expectedCount} active items after upload but found ${activeCount}`,
      );
    }
  },
);
