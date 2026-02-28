import { Before, After, BeforeAll, AfterAll } from '@cucumber/cucumber';
import { PocketWardrobeWorld } from '../world';
import {
  createInMemoryWardrobeRepository,
  createMockAIProcessorAdapter,
  createMockWeatherServiceAdapter,
  createMockImageStoreAdapter,
  createMockFaceDetectionAdapter,
  createMockConsentLogAdapter,
} from './mock-factories';
import {
  createStyleCalibrationUseCase,
  createItemDigitizationUseCase,
  createOutfitSuggestionUseCase,
  createWardrobeQueryUseCase,
} from './use-case-factories';

// ─── Suite-level setup ───────────────────────────────────────────────────────

BeforeAll(async function () {
  // Suite-wide setup: nothing required for in-memory test doubles.
  // If using a real test database (Supabase local), initialise schema here.
});

AfterAll(async function () {
  // Suite-wide teardown.
});

// ─── Scenario-level setup ────────────────────────────────────────────────────

Before(async function (this: PocketWardrobeWorld) {
  // Reset scenario state
  this.scenarioState = {
    confirmedItems: [],
  };

  // Create fresh mock adapters for each scenario (prevents state bleed)
  const wardrobeRepository = createInMemoryWardrobeRepository();
  const aiProcessor = createMockAIProcessorAdapter();
  const weatherService = createMockWeatherServiceAdapter();
  const imageStore = createMockImageStoreAdapter();
  const faceDetection = createMockFaceDetectionAdapter();
  const consentLog = createMockConsentLogAdapter();

  this.mocks = {
    aiProcessor,
    weatherService,
    imageStore,
    faceDetection,
    consentLog,
    wardrobeRepository,
  };

  // Wire use cases with mock adapters (dependency injection)
  this.ports = {
    styleCalibration: createStyleCalibrationUseCase({
      styleProfileRepository: wardrobeRepository,
    }),
    itemDigitization: createItemDigitizationUseCase({
      itemRepository: wardrobeRepository,
      aiProcessor,
      imageStore,
      faceDetection,
      consentLog,
    }),
    outfitSuggestion: createOutfitSuggestionUseCase({
      itemRepository: wardrobeRepository,
      outfitRepository: wardrobeRepository,
      wearEventRepository: wardrobeRepository,
      styleProfileRepository: wardrobeRepository,
      weatherService,
    }),
    wardrobeQuery: createWardrobeQueryUseCase({
      itemRepository: wardrobeRepository,
      wearEventRepository: wardrobeRepository,
    }),
  };
});

// ─── Scenario-level teardown ─────────────────────────────────────────────────

After(async function (this: PocketWardrobeWorld) {
  // In-memory adapters are garbage collected naturally.
  // If using a real test database, truncate tables here.
});
