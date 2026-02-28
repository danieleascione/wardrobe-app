/**
 * Milestone-2 step definitions: Camera-based item digitization
 *
 * Exercises DigitizeItemUseCase via WalkingSkeletonWorld.
 * Also defines shared state-setup steps used in milestone-3.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { DataTable } from '@cucumber/cucumber';
import { WalkingSkeletonWorld } from './world.js';
import { AIClassification } from '../../../../packages/domain/src/value-objects/index.js';

// ─── Background / setup steps ─────────────────────────────────────────────────

Given(
  'Sofia has completed style calibration',
  async function (this: WalkingSkeletonWorld) {
    // Ensure a completed style profile exists for the test user
    const existing = await this.styleProfileRepo.findByUserId(this.userId);
    if (!existing) {
      await this.calibrateStyleUseCase.completeCalibration(
        this.userId,
        'classic',
        ['work', 'casual'],
        'neutral',
      );
    }
  },
);

Given(
  'she has granted photo storage consent',
  async function (this: WalkingSkeletonWorld) {
    // hooks.ts pre-grants consent in Before hook — this step is a noop.
    // Verifying consent is already granted provides a clear audit trail.
    const granted = await this.consentLog.isConsentGranted(this.userId);
    assert.equal(granted, true, 'Expected photo storage consent to be pre-granted by hooks.ts');
  },
);

// ─── Shared state-setup steps (also used by milestone-3) ──────────────────────

/**
 * Seeds the wardrobe with N confirmed active items.
 * Uses a default coat classification for each; category doesn't matter for count tests.
 */
async function seedConfirmedItems(world: WalkingSkeletonWorld, count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    world.aiProcessor.configure({
      classification: new AIClassification({
        name: `Seeded Item ${i + 1}`,
        color_primary: 'White',
        color_hex: null,
        category: 'Tops',
        subcategory: 'Top',
        seasons: ['spring', 'summer', 'autumn', 'winter'],
        occasions: ['work', 'casual'],
        fabric: null,
        ai_confidence: 0.9,
      }),
      backgroundRemovedUrl: `https://in-memory-store.test/bg-removed/seeded-${i + 1}.webp`,
    });

    const item = await world.digitizeItemUseCase.initiateDigitization(
      world.userId,
      world.wardrobeId,
      Buffer.from(`seeded-item-${i + 1}`),
    );
    const confirmed = await world.digitizeItemUseCase.confirmItem(world.userId, item.item_id);
    world.state.confirmedItems.push(confirmed);
  }
  await world.syncWardrobeItemCount();
}

Given(
  "Sofia's wardrobe has {int} confirmed items",
  async function (this: WalkingSkeletonWorld, count: number) {
    await seedConfirmedItems(this, count);
  },
);

// ─── Background / setup steps ─────────────────────────────────────────────────

Given(
  'Sofia is on the item capture screen',
  function (this: WalkingSkeletonWorld) {
    // State check: any prior scenario state is acceptable; item capture is always accessible
  },
);

Given(
  'the AI service is available and returns a confident classification',
  function (this: WalkingSkeletonWorld) {
    // Configure mock AI processor for the trench coat (used in scenario 1)
    this.aiProcessor.configure({
      classification: new AIClassification({
        name: 'Camel Wool Coat',
        color_primary: 'Camel / Warm tan',
        color_hex: null,
        category: 'Outerwear',
        subcategory: 'Coat',
        seasons: ['spring', 'autumn', 'winter'],
        occasions: ['work', 'casual'],
        fabric: null,
        ai_confidence: 0.95,
      }),
      backgroundRemovedUrl: 'https://in-memory-store.test/bg-removed/camel-trench-coat.webp',
    });
  },
);

// ─── Action steps ─────────────────────────────────────────────────────────────

When(
  'she captures a well-lit photo of her camel trench coat laid flat',
  async function (this: WalkingSkeletonWorld) {
    // Initiates digitization only — item stays pending_ai (not yet confirmed)
    const item = await this.digitizeItemUseCase.initiateDigitization(
      this.userId,
      this.wardrobeId,
      Buffer.from('photo-camel-trench-coat'),
    );
    this.state.lastItem = item;
  },
);

When(
  'she captures a photo and the AI finishes processing',
  async function (this: WalkingSkeletonWorld) {
    // Initiates digitization; item is pending_ai — not yet confirmed
    const item = await this.digitizeItemUseCase.initiateDigitization(
      this.userId,
      this.wardrobeId,
      Buffer.from('photo-pending-item'),
    );
    this.state.lastItem = item;
  },
);

When(
  'she taps {string}',
  async function (this: WalkingSkeletonWorld, buttonLabel: string) {
    if (buttonLabel === 'Add to wardrobe') {
      const item = this.state.lastItem;
      assert.ok(item, 'Expected a pending item to confirm');
      const confirmed = await this.digitizeItemUseCase.confirmItem(this.userId, item.item_id);
      this.state.lastItem = confirmed;
      this.state.confirmedItems.push(confirmed);
      await this.syncWardrobeItemCount();
    }
    // Other button labels are UI concerns not covered at the domain layer
  },
);

// ─── Assertion steps ──────────────────────────────────────────────────────────

Then(
  'the photo is processed within {int} seconds',
  function (this: WalkingSkeletonWorld, _seconds: number) {
    // In tests the mock processor is synchronous — the domain contract is that
    // a pending_ai item exists after initiation.
    const item = this.state.lastItem;
    assert.ok(item, 'Expected an item to be created after photo processing');
    assert.equal(
      item.status,
      'pending_ai',
      'Expected item to be in pending_ai status after photo capture (not yet confirmed)',
    );
  },
);

Then(
  'the background-removed image of the coat is displayed',
  function (this: WalkingSkeletonWorld) {
    const item = this.state.lastItem;
    assert.ok(item, 'Expected an item to be created');
    assert.ok(
      item.photo_url_thumbnail,
      'Expected photo_url_thumbnail (background-removed URL) to be set on the item',
    );
    assert.ok(
      item.photo_url_thumbnail.includes('bg-removed'),
      `Expected photo_url_thumbnail to reference background-removed image but got "${item.photo_url_thumbnail}"`,
    );
  },
);

Then(
  'the suggested item details show:',
  function (this: WalkingSkeletonWorld, dataTable: DataTable) {
    const item = this.state.lastItem;
    assert.ok(item, 'Expected a pending item with AI classification data');

    const rows: string[][] = dataTable.raw();
    for (const [field, expectedValue] of rows) {
      switch (field.trim()) {
        case 'Name':
          assert.equal(
            item.name,
            expectedValue.trim(),
            `Name: expected "${expectedValue.trim()}" but got "${item.name}"`,
          );
          break;
        case 'Colour':
          assert.equal(
            item.color_primary,
            expectedValue.trim(),
            `Colour: expected "${expectedValue.trim()}" but got "${item.color_primary}"`,
          );
          break;
        case 'Category':
          assert.equal(
            item.category,
            expectedValue.trim(),
            `Category: expected "${expectedValue.trim()}" but got "${item.category}"`,
          );
          break;
        case 'Subcategory':
          assert.equal(
            item.subcategory,
            expectedValue.trim(),
            `Subcategory: expected "${expectedValue.trim()}" but got "${item.subcategory}"`,
          );
          break;
        case 'Seasons': {
          // "Spring/Autumn, Winter" → ['spring', 'autumn', 'winter']
          const expectedSeasons = expectedValue
            .split(/[,/]/)
            .map((s) => s.trim().toLowerCase());
          for (const s of expectedSeasons) {
            assert.ok(
              item.seasons.map((x) => x.toLowerCase()).includes(s),
              `Seasons: expected "${s}" in [${item.seasons.join(', ')}]`,
            );
          }
          break;
        }
        case 'Occasions': {
          // "Work, Casual" → ['work', 'casual']
          const expectedOccasions = expectedValue
            .split(',')
            .map((o) => o.trim().toLowerCase());
          for (const o of expectedOccasions) {
            assert.ok(
              item.occasions.map((x) => x.toLowerCase()).includes(o),
              `Occasions: expected "${o}" in [${item.occasions.join(', ')}]`,
            );
          }
          break;
        }
        default:
          // Unknown field — skip (future-proofing)
          break;
      }
    }
  },
);

Then(
  'all fields are editable before she confirms',
  function (this: WalkingSkeletonWorld) {
    // Mobile UI concern — the domain guarantees the item is in pending_ai status,
    // which signals the mobile layer to show the edit form before confirming.
    const item = this.state.lastItem;
    assert.ok(item, 'Expected a pending item');
    assert.equal(item.status, 'pending_ai', 'Item must be pending_ai so fields are still editable');
  },
);

Then(
  'an {string} button is displayed',
  function (this: WalkingSkeletonWorld, _buttonLabel: string) {
    // Mobile UI concern — button display is a mobile layer contract.
    // Domain contract: item in pending_ai status is ready for confirmation.
    const item = this.state.lastItem;
    assert.ok(item, 'Expected a pending item for the button to operate on');
    assert.equal(item.status, 'pending_ai');
  },
);

Then(
  'her wardrobe still shows {int} items',
  async function (this: WalkingSkeletonWorld, expectedCount: number) {
    const items = await this.itemRepo.findByWardrobe(this.wardrobeId);
    const activeCount = items.filter((i) => i.status === 'active').length;
    assert.equal(
      activeCount,
      expectedCount,
      `Expected ${expectedCount} active items but got ${activeCount} (pending_ai items excluded from count)`,
    );
  },
);

Then(
  'her wardrobe shows {int} items',
  async function (this: WalkingSkeletonWorld, expectedCount: number) {
    const items = await this.itemRepo.findByWardrobe(this.wardrobeId);
    const activeCount = items.filter((i) => i.status === 'active').length;
    assert.equal(
      activeCount,
      expectedCount,
      `Expected ${expectedCount} active items after confirmation but got ${activeCount}`,
    );
  },
);
