import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import { InMemoryWardrobeRepository } from '../../../../packages/domain/src/adapters/in-memory/InMemoryWardrobeRepository.js';
import { InMemoryItemRepository } from '../../../../packages/domain/src/adapters/in-memory/InMemoryItemRepository.js';
import { InMemoryStyleProfileRepository } from '../../../../packages/domain/src/adapters/in-memory/InMemoryStyleProfileRepository.js';
import { InMemoryOutfitRepository } from '../../../../packages/domain/src/adapters/in-memory/InMemoryOutfitRepository.js';
import { InMemoryWearEventRepository } from '../../../../packages/domain/src/adapters/in-memory/InMemoryWearEventRepository.js';
import { InMemoryImageStoreAdapter } from '../../../../packages/domain/src/adapters/in-memory/InMemoryImageStoreAdapter.js';
import { InMemoryConsentLogAdapter } from '../../../../packages/domain/src/adapters/in-memory/InMemoryConsentLogAdapter.js';
import { InMemoryAIQualityLogAdapter } from '../../../../packages/domain/src/adapters/in-memory/InMemoryAIQualityLogAdapter.js';
import { MockAIProcessor } from '../../../../packages/domain/src/adapters/in-memory/MockAIProcessor.js';
import { MockWeatherService } from '../../../../packages/domain/src/adapters/in-memory/MockWeatherService.js';
import { CalibrateStyleUseCase } from '../../../../packages/domain/src/use-cases/CalibrateStyleUseCase.js';
import { DigitizeItemUseCase } from '../../../../packages/domain/src/use-cases/DigitizeItemUseCase.js';
import { SuggestOutfitUseCase } from '../../../../packages/domain/src/use-cases/SuggestOutfitUseCase.js';
import { Wardrobe } from '../../../../packages/domain/src/entities/Wardrobe.js';
import type { Item } from '../../../../packages/domain/src/entities/Item.js';
import type { StyleProfile } from '../../../../packages/domain/src/entities/StyleProfile.js';
import type { Outfit } from '../../../../packages/domain/src/entities/Outfit.js';
import type { WearEvent } from '../../../../packages/domain/src/entities/WearEvent.js';
import { AIClassification, WeatherContext } from '../../../../packages/domain/src/value-objects/index.js';

// ─── Test state ───────────────────────────────────────────────────────────────

export interface WalkingSkeletonState {
  lastStyleProfile?: StyleProfile;
  lastItem?: Item;
  lastOutfit?: Outfit | null;
  lastWearEvent?: WearEvent;
  confirmedItems: Item[];
}

// ─── Walking Skeleton World ───────────────────────────────────────────────────
//
// Wired via the DI container design: use cases receive injected adapters.
// Shared adapter instances allow cross-use-case state visibility.

export class WalkingSkeletonWorld extends World {
  // ── Shared adapter instances ─────────────────────────────────────────────
  readonly styleProfileRepo: InMemoryStyleProfileRepository;
  readonly itemRepo: InMemoryItemRepository;
  readonly wardrobeRepo: InMemoryWardrobeRepository;
  readonly outfitRepo: InMemoryOutfitRepository;
  readonly wearEventRepo: InMemoryWearEventRepository;
  readonly imageStore: InMemoryImageStoreAdapter;
  readonly consentLog: InMemoryConsentLogAdapter;
  readonly aiQualityLog: InMemoryAIQualityLogAdapter;
  readonly aiProcessor: MockAIProcessor;
  readonly weatherService: MockWeatherService;

  // ── Use cases — wired from container ────────────────────────────────────
  readonly calibrateStyleUseCase: CalibrateStyleUseCase;
  readonly digitizeItemUseCase: DigitizeItemUseCase;
  readonly suggestOutfitUseCase: SuggestOutfitUseCase;

  // ── Test scenario state ──────────────────────────────────────────────────
  userId: string;
  wardrobeId: string;
  state: WalkingSkeletonState;

  constructor(options: IWorldOptions) {
    super(options);

    // ── Adapters ─────────────────────────────────────────────────────────
    this.styleProfileRepo = new InMemoryStyleProfileRepository();
    this.itemRepo = new InMemoryItemRepository();
    this.wardrobeRepo = new InMemoryWardrobeRepository();
    this.outfitRepo = new InMemoryOutfitRepository();
    this.wearEventRepo = new InMemoryWearEventRepository();
    this.imageStore = new InMemoryImageStoreAdapter();
    this.consentLog = new InMemoryConsentLogAdapter();
    this.aiQualityLog = new InMemoryAIQualityLogAdapter();
    this.aiProcessor = new MockAIProcessor();
    this.weatherService = new MockWeatherService();

    // ── Default mock configurations ──────────────────────────────────────
    this.aiProcessor.configure({
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

    this.weatherService.configure(
      new WeatherContext({
        city: 'Milan',
        date: new Date().toISOString().slice(0, 10),
        tempCelsius: 12,
        condition: 'partly_cloudy',
      }),
    );

    // ── Use cases wired via constructor injection ─────────────────────────
    this.calibrateStyleUseCase = new CalibrateStyleUseCase(this.styleProfileRepo);

    this.digitizeItemUseCase = new DigitizeItemUseCase(
      this.itemRepo,
      this.wardrobeRepo,
      this.aiProcessor,
      this.imageStore,
      this.consentLog,
      this.aiQualityLog,
    );

    this.suggestOutfitUseCase = new SuggestOutfitUseCase(
      this.itemRepo,
      this.wardrobeRepo,
      this.outfitRepo,
      this.wearEventRepo,
      this.weatherService,
    );

    // ── Test identity ────────────────────────────────────────────────────
    this.userId = `sofia-${Date.now()}`;
    this.wardrobeId = `wardrobe-${this.userId}`;

    this.state = {
      confirmedItems: [],
    };
  }

  /**
   * Seed the wardrobe entity with the current confirmed item count.
   * Called after each item is confirmed to keep item_count in sync
   * (mirrors the DB trigger behaviour in production).
   */
  async syncWardrobeItemCount(): Promise<void> {
    const items = await this.itemRepo.findByWardrobe(this.wardrobeId);
    const activeItems = items.filter((i) => i.status === 'active');
    const now = new Date();
    await this.wardrobeRepo.save(
      new Wardrobe({
        wardrobe_id: this.wardrobeId,
        user_id: this.userId,
        item_count: activeItems.length,
        first_unlock_achieved: activeItems.length >= 5,
        created_at: now,
        updated_at: now,
      }),
    );
  }
}

setWorldConstructor(WalkingSkeletonWorld);
