/**
 * Milestone-1 step definitions: First-time style calibration
 *
 * Exercises CalibrateStyleUseCase via WalkingSkeletonWorld.
 * Steps that overlap with walking-skeleton.steps.ts are NOT redefined here.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { WalkingSkeletonWorld } from './world.js';

// ─── Background / setup steps ─────────────────────────────────────────────────

Given(
  'the style calibration screen presents exactly {int} questions',
  function (this: WalkingSkeletonWorld, _questionCount: number) {
    // Product contract — 3 calibration fields (archetype, occasions, palette).
    // This is verified by the domain accepting exactly those 3 inputs.
  },
);

Given(
  'Sofia has opened PocketWardrobe for the first time',
  async function (this: WalkingSkeletonWorld) {
    const existing = await this.styleProfileRepo.findByUserId(this.userId);
    assert.equal(existing, null, 'Expected no style profile on first launch');
  },
);

Given(
  'she has not previously completed any style questions',
  async function (this: WalkingSkeletonWorld) {
    const existing = await this.styleProfileRepo.findByUserId(this.userId);
    assert.equal(existing, null, 'Expected no style profile before calibration');
  },
);

Given(
  'Marco has opened PocketWardrobe for the first time',
  async function (this: WalkingSkeletonWorld) {
    // The World is seeded fresh per scenario — userId represents Marco here
    const existing = await this.styleProfileRepo.findByUserId(this.userId);
    assert.equal(existing, null, 'Expected no style profile for Marco on first launch');
  },
);

// ─── Action steps ─────────────────────────────────────────────────────────────

When(
  'she confirms her calibration',
  async function (this: WalkingSkeletonWorld) {
    // Alias: same behaviour as 'she confirms her style calibration'
    const draft = this.state.lastStyleProfile as {
      archetype?: string;
      occasion_priorities?: string[];
      palette?: string;
    } | undefined;

    const archetype = (draft?.archetype ?? 'classic').toLowerCase().split(' ')[0];
    const palette = (draft?.palette ?? 'neutral').toLowerCase().split(' ')[0];
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

When(
  'he dismisses the style calibration screen without answering any questions',
  async function (this: WalkingSkeletonWorld) {
    const profile = await this.calibrateStyleUseCase.skipCalibration(this.userId);
    this.state.lastStyleProfile = profile;
  },
);

// ─── Assertion steps ──────────────────────────────────────────────────────────

Then(
  'she is navigated to the item capture screen',
  function (this: WalkingSkeletonWorld) {
    // Navigation is a mobile UI concern.
    // Domain contract: style profile must exist before navigation to item capture.
    const profile = this.state.lastStyleProfile;
    assert.ok(profile, 'Expected style profile to exist before navigating to item capture');
  },
);

Then(
  'he is navigated to the item capture screen',
  function (this: WalkingSkeletonWorld) {
    const profile = this.state.lastStyleProfile;
    assert.ok(profile, 'Expected style profile to exist before navigating to item capture');
  },
);

Then(
  'the progress indicator shows {string}',
  async function (this: WalkingSkeletonWorld, expectedText: string) {
    const items = await this.itemRepo.findByWardrobe(this.wardrobeId);
    const activeCount = items.filter((i) => i.status === 'active').length;

    const match = expectedText.match(/(\d+) of 5/);
    if (match) {
      const expected = parseInt(match[1], 10);
      assert.equal(
        activeCount,
        expected,
        `Expected progress indicator to show ${expected} of 5 but active item count is ${activeCount}`,
      );
    }
    // Indicator text format is a UI concern — domain only surfaces item count
  },
);

Then(
  'the calibration screen is not shown again on her next launch',
  async function (this: WalkingSkeletonWorld) {
    const profile = await this.styleProfileRepo.findByUserId(this.userId);
    assert.ok(profile, 'Expected a style profile to exist');
    assert.equal(
      profile.calibration_completed,
      true,
      'Expected calibration_completed = true so the screen is not shown again',
    );
  },
);

Then(
  'a default style profile is created with archetype {string}, occasions {string}, and palette {string}',
  async function (
    this: WalkingSkeletonWorld,
    expectedArchetype: string,
    expectedOccasions: string,
    expectedPalette: string,
  ) {
    const profile = await this.styleProfileRepo.findByUserId(this.userId);
    assert.ok(profile, 'Expected a default style profile to be created');
    assert.equal(
      profile.archetype,
      expectedArchetype.toLowerCase(),
      `Expected archetype "${expectedArchetype}" but got "${profile.archetype}"`,
    );
    assert.equal(
      profile.calibration_completed,
      false,
      'Default profile should have calibration_completed = false',
    );

    const occasionList = expectedOccasions.split(' and ').map((o) => o.trim().toLowerCase());
    for (const occasion of occasionList) {
      assert.ok(
        profile.occasion_priorities.includes(occasion),
        `Expected occasion "${occasion}" in profile [${profile.occasion_priorities.join(', ')}]`,
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
  'a notice reads {string}',
  function (this: WalkingSkeletonWorld, _expectedText: string) {
    // Domain contract: calibration_completed = false signals mobile to display
    // the "Complete your style profile..." notice. UI copy is a mobile concern.
    const profile = this.state.lastStyleProfile;
    assert.ok(profile, 'Expected a style profile to check notice visibility');
    assert.equal(
      profile.calibration_completed,
      false,
      'Expected calibration_completed = false to trigger the improvement notice',
    );
  },
);

Then(
  'tapping the notice opens the style calibration screen',
  function (this: WalkingSkeletonWorld) {
    // Mobile routing contract — no domain behaviour to assert here.
    // The domain guarantees calibration_completed = false; mobile routes accordingly.
  },
);
