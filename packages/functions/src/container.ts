/**
 * DI Container — wires domain use cases to adapter implementations.
 *
 * container.ts is the only file that imports both domain use cases and
 * adapter implementations. No use case class imports an adapter directly.
 *
 * Two profiles:
 *   'test'       — in-memory / mock adapters; no external services required
 *   'production' — Supabase persistence + Nano Banana AI adapter
 */

// ── Domain use cases ──────────────────────────────────────────────────────
import { CalibrateStyleUseCase } from '../../domain/src/use-cases/CalibrateStyleUseCase.js';
import { DigitizeItemUseCase } from '../../domain/src/use-cases/DigitizeItemUseCase.js';
import { SuggestOutfitUseCase } from '../../domain/src/use-cases/SuggestOutfitUseCase.js';

// ── In-memory / mock adapters (test profile) ──────────────────────────────
import { InMemoryStyleProfileRepository } from '../../domain/src/adapters/in-memory/InMemoryStyleProfileRepository.js';
import { InMemoryItemRepository } from '../../domain/src/adapters/in-memory/InMemoryItemRepository.js';
import { InMemoryWardrobeRepository } from '../../domain/src/adapters/in-memory/InMemoryWardrobeRepository.js';
import { InMemoryOutfitRepository } from '../../domain/src/adapters/in-memory/InMemoryOutfitRepository.js';
import { InMemoryWearEventRepository } from '../../domain/src/adapters/in-memory/InMemoryWearEventRepository.js';
import { InMemoryImageStoreAdapter } from '../../domain/src/adapters/in-memory/InMemoryImageStoreAdapter.js';
import { InMemoryConsentLogAdapter } from '../../domain/src/adapters/in-memory/InMemoryConsentLogAdapter.js';
import { InMemoryAIQualityLogAdapter } from '../../domain/src/adapters/in-memory/InMemoryAIQualityLogAdapter.js';
import { MockAIProcessor } from '../../domain/src/adapters/in-memory/MockAIProcessor.js';
import { MockWeatherService } from '../../domain/src/adapters/in-memory/MockWeatherService.js';
import { AIClassification, WeatherContext } from '../../domain/src/value-objects/index.js';

// ── Supabase adapters (production profile) ────────────────────────────────
import { SupabaseStyleProfileRepository } from './adapters/supabase/SupabaseStyleProfileRepository.js';
import { SupabaseItemRepository } from './adapters/supabase/SupabaseItemRepository.js';
import { SupabaseWardrobeRepository } from './adapters/supabase/SupabaseWardrobeRepository.js';
import { SupabaseOutfitRepository } from './adapters/supabase/SupabaseOutfitRepository.js';
import { SupabaseWearEventRepository } from './adapters/supabase/SupabaseWearEventRepository.js';
import { SupabaseConsentLogAdapter } from './adapters/supabase/SupabaseConsentLogAdapter.js';
import { SupabaseAIQualityLogAdapter } from './adapters/supabase/SupabaseAIQualityLogAdapter.js';
import { NanaBananaAdapter } from './adapters/nano-banana/NanaBananaAdapter.js';
import { createClient } from '@supabase/supabase-js';

// ── Public types ──────────────────────────────────────────────────────────

export type AdapterProfile = 'test' | 'production';

export interface AppContainer {
  readonly calibrateStyleUseCase: CalibrateStyleUseCase;
  readonly digitizeItemUseCase: DigitizeItemUseCase;
  readonly suggestOutfitUseCase: SuggestOutfitUseCase;
}

/**
 * Optional overrides for the test profile — supplied by callers that need
 * to control mock behaviour (e.g., Cucumber step definitions configuring
 * weather or AI responses).
 */
export interface TestProfileOverrides {
  /** Pre-configured MockAIProcessor instance. */
  mockAIProcessor?: MockAIProcessor;
  /** Pre-configured MockWeatherService instance. */
  mockWeatherService?: MockWeatherService;
  /** Pre-seeded InMemoryWardrobeRepository instance. */
  wardrobeRepo?: InMemoryWardrobeRepository;
  /** Pre-seeded InMemoryItemRepository instance. */
  itemRepo?: InMemoryItemRepository;
}

// ── Factory ───────────────────────────────────────────────────────────────

/**
 * Create a fully wired AppContainer for the given profile.
 *
 * test profile:
 *   - CalibrateStyleUseCase ← InMemoryStyleProfileRepository
 *   - DigitizeItemUseCase   ← InMemoryItemRepository, InMemoryWardrobeRepository,
 *                              MockAIProcessor (pre-configured), InMemoryImageStoreAdapter,
 *                              InMemoryConsentLogAdapter (pre-consented), InMemoryAIQualityLogAdapter
 *   - SuggestOutfitUseCase  ← InMemoryItemRepository, InMemoryWardrobeRepository,
 *                              InMemoryOutfitRepository, InMemoryWearEventRepository,
 *                              MockWeatherService (returns 15°C partly cloudy)
 *
 * production profile:
 *   - All three use cases wired to Supabase adapters.
 *   - DigitizeItemUseCase AI processor wired to NanaBananaAdapter.
 *   - SuggestOutfitUseCase weather service wired to MockWeatherService
 *     (placeholder — a real weather adapter is a future step).
 */
export function createContainer(
  profile: AdapterProfile,
  overrides: TestProfileOverrides = {},
): AppContainer {
  if (profile === 'test') {
    return createTestContainer(overrides);
  }
  return createProductionContainer();
}

// ── Test container ────────────────────────────────────────────────────────

function createTestContainer(overrides: TestProfileOverrides): AppContainer {
  // Shared in-memory stores — same instance across all use cases so that
  // data written by one use case is visible to queries from another.
  const styleProfileRepo = new InMemoryStyleProfileRepository();
  const itemRepo = overrides.itemRepo ?? new InMemoryItemRepository();
  const wardrobeRepo = overrides.wardrobeRepo ?? new InMemoryWardrobeRepository();
  const outfitRepo = new InMemoryOutfitRepository();
  const wearEventRepo = new InMemoryWearEventRepository();
  const imageStore = new InMemoryImageStoreAdapter();
  const aiQualityLog = new InMemoryAIQualityLogAdapter();

  // ConsentLogAdapter pre-consented — test profile assumes consent is granted.
  const consentLog = new InMemoryConsentLogAdapter();

  // MockAIProcessor — caller may provide a pre-configured instance.
  const aiProcessor = overrides.mockAIProcessor ?? buildDefaultMockAIProcessor();

  // MockWeatherService — returns 15°C partly cloudy by default.
  const weatherService = overrides.mockWeatherService ?? buildDefaultMockWeatherService();

  return {
    calibrateStyleUseCase: new CalibrateStyleUseCase(styleProfileRepo),

    digitizeItemUseCase: new DigitizeItemUseCase(
      itemRepo,
      wardrobeRepo,
      aiProcessor,
      imageStore,
      consentLog,
      aiQualityLog,
    ),

    suggestOutfitUseCase: new SuggestOutfitUseCase(
      itemRepo,
      wardrobeRepo,
      outfitRepo,
      wearEventRepo,
      weatherService,
    ),
  };
}

function buildDefaultMockAIProcessor(): MockAIProcessor {
  const processor = new MockAIProcessor();
  processor.configure({
    classification: new AIClassification({
      name: 'Test Garment',
      color_primary: 'White',
      color_hex: null,
      category: 'Tops',
      subcategory: 'Top',
      seasons: ['spring', 'summer', 'autumn', 'winter'],
      occasions: ['work', 'casual'],
      fabric: null,
      ai_confidence: 0.9,
    }),
    backgroundRemovedUrl: 'https://in-memory-store.test/bg-removed/test-garment.webp',
  });
  return processor;
}

function buildDefaultMockWeatherService(): MockWeatherService {
  const service = new MockWeatherService();
  service.configure(
    new WeatherContext({
      city: 'Milan',
      date: new Date().toISOString().slice(0, 10),
      tempCelsius: 15,
      condition: 'partly_cloudy',
    }),
  );
  return service;
}

// ── Production container ──────────────────────────────────────────────────

function createProductionContainer(): AppContainer {
  const supabaseUrl = process.env['SUPABASE_URL'] ?? '';
  const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  const styleProfileRepo = new SupabaseStyleProfileRepository(supabase);
  const itemRepo = new SupabaseItemRepository(supabase);
  const wardrobeRepo = new SupabaseWardrobeRepository(supabase);
  const outfitRepo = new SupabaseOutfitRepository(supabase);
  const wearEventRepo = new SupabaseWearEventRepository(supabase);
  const consentLog = new SupabaseConsentLogAdapter(supabase);
  const aiQualityLog = new SupabaseAIQualityLogAdapter(supabase);

  const nanoBananaApiKey = process.env['NANO_BANANA_API_KEY'] ?? '';
  const nanoBananaBaseUrl = process.env['NANO_BANANA_BASE_URL'] ?? 'https://api.nanobanana.ai';
  const aiProcessor = new NanaBananaAdapter({ apiKey: nanoBananaApiKey, baseUrl: nanoBananaBaseUrl });

  // MockWeatherService as placeholder until a real weather service adapter is built.
  const weatherService = buildDefaultMockWeatherService();

  // InMemoryImageStoreAdapter used until a real image store adapter is implemented.
  const imageStore = new InMemoryImageStoreAdapter();

  return {
    calibrateStyleUseCase: new CalibrateStyleUseCase(styleProfileRepo),

    digitizeItemUseCase: new DigitizeItemUseCase(
      itemRepo,
      wardrobeRepo,
      aiProcessor,
      imageStore,
      consentLog,
      aiQualityLog,
    ),

    suggestOutfitUseCase: new SuggestOutfitUseCase(
      itemRepo,
      wardrobeRepo,
      outfitRepo,
      wearEventRepo,
      weatherService,
    ),
  };
}
