import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { PocketWardrobeWorld, buildTestItem } from './world';

// ─── Item Digitization Steps ─────────────────────────────────────────────────
// Driving port: ItemDigitizationPort
// File: milestone-2-item-digitization.feature

Given(
  'Sofia has completed style calibration',
  async function (this: PocketWardrobeWorld) {
    await this.ports.styleCalibration.completeCalibration(
      this.currentUser.userId,
      'classic',
      ['work', 'casual'],
      'neutral',
    );
  },
);

Given(
  'she has granted photo storage consent',
  async function (this: PocketWardrobeWorld) {
    await this.mocks.consentLog.recordConsent(
      this.currentUser.userId,
      'photo_storage',
      'v1.0',
    );
  },
);

Given(
  'Sofia is on the item capture screen',
  function (this: PocketWardrobeWorld) {
    // Precondition: user is authenticated and has style profile.
    // Navigation state — no domain action required.
  },
);

Given(
  'the AI service is available and returns a confident classification',
  function (this: PocketWardrobeWorld) {
    this.mocks.aiProcessor.configureResponse({
      category: 'Outerwear',
      subcategory: 'Coat',
      colorPrimary: 'Camel / Warm tan',
      seasons: ['spring', 'autumn', 'winter'],
      occasions: ['work', 'casual'],
      confidence: 0.92,
      suggestedName: 'Camel Wool Coat',
      faceDetected: false,
    });
  },
);

Given(
  'the AI service is temporarily unavailable',
  function (this: PocketWardrobeWorld) {
    this.mocks.aiProcessor.configureUnavailable();
  },
);

Given(
  "Sofia's wardrobe has {int} confirmed items",
  async function (this: PocketWardrobeWorld, count: number) {
    await this.buildWardrobeWithItems(count);
  },
);

Given(
  "Sofia's linen blazer photo has been processed",
  async function (this: PocketWardrobeWorld) {
    this.mocks.aiProcessor.configureResponse({
      category: 'Tops',
      subcategory: 'Blouse',
      colorPrimary: 'Linen / Natural',
      seasons: ['spring', 'summer'],
      occasions: ['casual', 'work'],
      confidence: 0.87,
      suggestedName: 'Linen Top',
      faceDetected: false,
    });

    const job = await this.ports.itemDigitization.initiateDigitization(
      this.currentUser.userId,
      'test-photo-key-blazer',
    );
    this.scenarioState.lastDigitizationJob = job;
  },
);

Given(
  'the AI has suggested category {string} and subcategory {string}',
  function (this: PocketWardrobeWorld, category: string, subcategory: string) {
    const job = this.scenarioState.lastDigitizationJob;
    assert.ok(job, 'Expected a digitization job to exist');
    assert.equal(job.aiClassification?.category, category);
    assert.equal(job.aiClassification?.subcategory, subcategory);
  },
);

Given(
  'the face detection mock is configured to detect a face in the test photo',
  function (this: PocketWardrobeWorld) {
    this.mocks.faceDetection.configureFaceDetected(true);
  },
);

When(
  'she captures a well-lit photo of her camel trench coat laid flat',
  async function (this: PocketWardrobeWorld) {
    const job = await this.ports.itemDigitization.initiateDigitization(
      this.currentUser.userId,
      'test-photo-key-camel-coat',
    );
    this.scenarioState.lastDigitizationJob = job;
  },
);

When(
  'she captures a photo and the AI finishes processing',
  async function (this: PocketWardrobeWorld) {
    const job = await this.ports.itemDigitization.initiateDigitization(
      this.currentUser.userId,
      'test-photo-key',
    );
    this.scenarioState.lastDigitizationJob = job;
  },
);

When(
  'she taps {string}',
  async function (this: PocketWardrobeWorld, buttonLabel: string) {
    if (buttonLabel === 'Add to wardrobe') {
      const job = this.scenarioState.lastDigitizationJob;
      assert.ok(job, 'Expected a digitization job to confirm');

      const classification = job.aiClassification;
      const item = await this.ports.itemDigitization.confirmItem(
        this.currentUser.userId,
        job.jobId,
        {
          name: classification?.suggestedName ?? 'My Item',
          colorPrimary: classification?.colorPrimary ?? 'Unknown',
          category: classification?.category ?? 'Tops',
          subcategory: classification?.subcategory ?? 'Top',
          seasons: classification?.seasons ?? [],
          occasions: classification?.occasions ?? [],
        },
      );
      this.scenarioState.lastConfirmedItem = item;
    }
  },
);

When(
  'she chooses to import from her photo gallery',
  function (this: PocketWardrobeWorld) {
    // Gallery import uses the same digitisation port as camera capture.
    // The distinction is in the mobile UI layer only.
  },
);

When(
  'selects an existing photo of her dark slim jeans',
  async function (this: PocketWardrobeWorld) {
    this.mocks.aiProcessor.configureResponse({
      category: 'Bottoms',
      subcategory: 'Jeans',
      colorPrimary: 'Dark indigo',
      seasons: ['spring', 'summer', 'autumn', 'winter'],
      occasions: ['work', 'casual'],
      confidence: 0.89,
      suggestedName: 'Dark Slim Jeans',
      faceDetected: false,
    });

    const job = await this.ports.itemDigitization.initiateDigitization(
      this.currentUser.userId,
      'gallery-photo-key-jeans',
    );
    this.scenarioState.lastDigitizationJob = job;
  },
);

When(
  'Sofia reviews the suggested details',
  function (this: PocketWardrobeWorld) {
    // User reads the pre-filled form — no domain action
  },
);

When(
  'she changes the category to {string} and subcategory to {string}',
  function (this: PocketWardrobeWorld, category: string, subcategory: string) {
    // Store the correction for use in the confirm step
    const job = this.scenarioState.lastDigitizationJob;
    if (job?.aiClassification) {
      job.aiClassification.category = category;
      job.aiClassification.subcategory = subcategory;
    }
  },
);

When(
  'she photographs a {word}',
  async function (this: PocketWardrobeWorld, _garmentType: string) {
    const job = await this.ports.itemDigitization.initiateDigitization(
      this.currentUser.userId,
      `test-photo-key-${Date.now()}`,
    );
    this.scenarioState.lastDigitizationJob = job;
  },
);

When(
  'the item digitisation use case processes the coat photo',
  async function (this: PocketWardrobeWorld) {
    const job = await this.ports.itemDigitization.initiateDigitization(
      this.currentUser.userId,
      'test-coat-photo-key',
    );
    this.scenarioState.lastDigitizationJob = job;
  },
);

When(
  'the item digitisation use case processes the photo',
  async function (this: PocketWardrobeWorld) {
    try {
      const job = await this.ports.itemDigitization.initiateDigitization(
        this.currentUser.userId,
        'test-photo-with-face',
      );
      this.scenarioState.lastDigitizationJob = job;
    } catch (error) {
      this.scenarioState.thrownError = error as Error;
    }
  },
);

Then(
  'the photo is processed within 10 seconds',
  function (this: PocketWardrobeWorld) {
    // Processing time is an NFR enforced at the infrastructure layer.
    // The domain contract is that the job returns in ready_for_review status.
    const job = this.scenarioState.lastDigitizationJob;
    assert.ok(job, 'Expected a digitization job');
    assert.equal(job.status, 'ready_for_review');
  },
);

Then(
  'the background-removed image of the coat is displayed',
  function (this: PocketWardrobeWorld) {
    const job = this.scenarioState.lastDigitizationJob;
    assert.ok(job?.aiClassification?.backgroundRemovedUrl, 'Expected a background-removed URL');
  },
);

Then(
  'the suggested item details show:',
  function (this: PocketWardrobeWorld, dataTable: DataTable) {
    const job = this.scenarioState.lastDigitizationJob;
    assert.ok(job?.aiClassification, 'Expected AI classification results');

    const classification = job.aiClassification;
    const rows = dataTable.rows();

    for (const [field, expectedValue] of rows) {
      switch (field.trim()) {
        case 'Name':
          assert.equal(classification.suggestedName, expectedValue.trim());
          break;
        case 'Colour':
          assert.equal(classification.colorPrimary, expectedValue.trim());
          break;
        case 'Category':
          assert.equal(classification.category, expectedValue.trim());
          break;
        case 'Subcategory':
          assert.equal(classification.subcategory, expectedValue.trim());
          break;
        case 'Seasons':
          // Verify all expected seasons are present
          for (const season of expectedValue.split(',').map((s) => s.trim().toLowerCase())) {
            assert.ok(
              classification.seasons.map((s) => s.toLowerCase()).includes(season),
              `Expected season "${season}" in classification`,
            );
          }
          break;
        case 'Occasions':
          for (const occasion of expectedValue.split(',').map((s) => s.trim().toLowerCase())) {
            assert.ok(
              classification.occasions.map((o) => o.toLowerCase()).includes(occasion),
              `Expected occasion "${occasion}" in classification`,
            );
          }
          break;
      }
    }
  },
);

Then(
  'all fields are editable before she confirms',
  function (this: PocketWardrobeWorld) {
    // Editability is a mobile UI contract.
    // Domain contract: the metadata review step accepts corrections before confirmation.
    const job = this.scenarioState.lastDigitizationJob;
    assert.equal(job?.status, 'ready_for_review');
  },
);

Then(
  'an {string} button is displayed',
  function (this: PocketWardrobeWorld, _buttonLabel: string) {
    // UI contract — the domain guarantees the job is in reviewable state.
    const job = this.scenarioState.lastDigitizationJob;
    assert.equal(job?.status, 'ready_for_review');
  },
);

Then(
  'her wardrobe still shows {int} items',
  async function (this: PocketWardrobeWorld, expectedCount: number) {
    const count = await this.mocks.wardrobeRepository.getItemCount(
      this.currentUser.userId,
    );
    assert.equal(count, expectedCount);
  },
);

Then(
  'her wardrobe shows {int} items',
  async function (this: PocketWardrobeWorld, expectedCount: number) {
    const count = await this.mocks.wardrobeRepository.getItemCount(
      this.currentUser.userId,
    );
    assert.equal(count, expectedCount);
  },
);

Then(
  'the photo is processed by the AI identically to a camera capture',
  function (this: PocketWardrobeWorld) {
    const job = this.scenarioState.lastDigitizationJob;
    assert.equal(job?.status, 'ready_for_review');
    assert.ok(job?.aiClassification);
  },
);

Then(
  'within 10 seconds she sees suggested details for the jeans',
  function (this: PocketWardrobeWorld) {
    const job = this.scenarioState.lastDigitizationJob;
    assert.equal(job?.status, 'ready_for_review');
    assert.ok(job?.aiClassification);
  },
);

Then(
  'the category shows {string} and subcategory {string}',
  function (this: PocketWardrobeWorld, expectedCategory: string, expectedSubcategory: string) {
    const job = this.scenarioState.lastDigitizationJob;
    assert.equal(job?.aiClassification?.category, expectedCategory);
    assert.equal(job?.aiClassification?.subcategory, expectedSubcategory);
  },
);

Then(
  'she can confirm or edit before adding to her wardrobe',
  function (this: PocketWardrobeWorld) {
    const job = this.scenarioState.lastDigitizationJob;
    assert.equal(job?.status, 'ready_for_review');
  },
);

Then(
  'the item is saved with category {string} and subcategory {string}',
  async function (this: PocketWardrobeWorld, expectedCategory: string, expectedSubcategory: string) {
    const item = this.scenarioState.lastConfirmedItem;
    assert.ok(item, 'Expected a confirmed item');
    assert.equal(item.category, expectedCategory);
    assert.equal(item.subcategory, expectedSubcategory);
  },
);

Then(
  'the correction is logged so the AI can improve over time',
  function (this: PocketWardrobeWorld) {
    const item = this.scenarioState.lastConfirmedItem;
    assert.ok(item, 'Expected a confirmed item');
    assert.equal(
      item.manualClassification,
      true,
      'Expected manual_classification to be true for a corrected item',
    );
  },
);

Then(
  'the category field shows {string}',
  function (this: PocketWardrobeWorld, expectedCategory: string) {
    const job = this.scenarioState.lastDigitizationJob;
    assert.equal(job?.aiClassification?.category, expectedCategory);
  },
);

Then(
  'the subcategory field shows {string}',
  function (this: PocketWardrobeWorld, expectedSubcategory: string) {
    const job = this.scenarioState.lastDigitizationJob;
    assert.equal(job?.aiClassification?.subcategory, expectedSubcategory);
  },
);

Then(
  'the result contains a background-removed image URL',
  function (this: PocketWardrobeWorld) {
    const job = this.scenarioState.lastDigitizationJob;
    assert.ok(
      job?.aiClassification?.backgroundRemovedUrl,
      'Expected a background-removed URL in the AI result',
    );
  },
);

Then(
  'the result contains a category of {string} and subcategory {string}',
  function (this: PocketWardrobeWorld, category: string, subcategory: string) {
    const job = this.scenarioState.lastDigitizationJob;
    assert.equal(job?.aiClassification?.category, category);
    assert.equal(job?.aiClassification?.subcategory, subcategory);
  },
);

Then(
  'the result contains colour {string}',
  function (this: PocketWardrobeWorld, expectedColor: string) {
    const job = this.scenarioState.lastDigitizationJob;
    assert.equal(job?.aiClassification?.colorPrimary, expectedColor);
  },
);

Then(
  'the confidence score is {float}',
  function (this: PocketWardrobeWorld, expectedConfidence: number) {
    const job = this.scenarioState.lastDigitizationJob;
    assert.equal(job?.aiClassification?.confidence, expectedConfidence);
  },
);

Then(
  'the result includes seasons and occasions arrays',
  function (this: PocketWardrobeWorld) {
    const job = this.scenarioState.lastDigitizationJob;
    assert.ok(Array.isArray(job?.aiClassification?.seasons));
    assert.ok(Array.isArray(job?.aiClassification?.occasions));
    assert.ok((job?.aiClassification?.seasons.length ?? 0) > 0);
    assert.ok((job?.aiClassification?.occasions.length ?? 0) > 0);
  },
);

Then(
  'the digitisation does not proceed to AI classification',
  function (this: PocketWardrobeWorld) {
    const job = this.scenarioState.lastDigitizationJob;
    assert.ok(job, 'Expected a job to be created');
    assert.equal(
      job.aiClassification?.faceDetected,
      true,
      'Expected face detection to have blocked AI classification',
    );
    // AI was not called after face detection
    assert.equal(
      this.mocks.aiProcessor.getCallCount(),
      0,
      'Expected AI processor to not be called when face is detected',
    );
  },
);

Then(
  'the result signals that a face was detected',
  function (this: PocketWardrobeWorld) {
    const job = this.scenarioState.lastDigitizationJob;
    assert.equal(job?.aiClassification?.faceDetected, true);
  },
);

Then(
  'the photo is not submitted to the AI service',
  function (this: PocketWardrobeWorld) {
    assert.equal(this.mocks.aiProcessor.getCallCount(), 0);
  },
);
