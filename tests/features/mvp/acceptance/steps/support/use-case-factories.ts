import {
  StyleCalibrationPort,
  ItemDigitizationPort,
  OutfitSuggestionPort,
  WardrobeQueryPort,
  WardrobeRepository,
  AIProcessorPort,
  WeatherServicePort,
  ImageStorePort,
  FaceDetectionPort,
  ConsentLogPort,
  StyleProfile,
  Item,
  DigitizationJob,
  ItemMetadata,
  OutfitSuggestion,
  OutfitPreview,
  WearEvent,
  WardrobeStats,
  WardrobeFilters,
  buildTestItem,
} from '../world';

// ─── Use Case Factories ──────────────────────────────────────────────────────
//
// These factories create use case implementations that accept injected ports.
// In production, these implementations live in packages/domain/use-cases/.
// In tests, we instantiate them here to verify they work with mock adapters.
//
// The factories accept the outbound port interfaces — never concrete adapters.
// This enforces the hexagonal boundary in tests as well as production code.

// ─── Style Calibration Use Case ──────────────────────────────────────────────

interface StyleCalibrationDeps {
  styleProfileRepository: Pick<WardrobeRepository, 'saveStyleProfile' | 'findStyleProfile'>;
}

export function createStyleCalibrationUseCase(
  deps: StyleCalibrationDeps,
): StyleCalibrationPort {
  return {
    async completeCalibration(
      userId: string,
      archetype: string,
      occasions: string[],
      palette: string,
    ): Promise<StyleProfile> {
      const profile: StyleProfile = {
        styleProfileId: `sp-${userId}`,
        userId,
        archetype: archetype.toLowerCase(),
        occasionPriorities: occasions.map((o) => o.toLowerCase()),
        palette: palette.toLowerCase(),
        calibrationCompleted: true,
      };
      return deps.styleProfileRepository.saveStyleProfile(profile);
    },

    async skipCalibration(userId: string): Promise<StyleProfile> {
      const profile: StyleProfile = {
        styleProfileId: `sp-${userId}`,
        userId,
        archetype: 'classic',
        occasionPriorities: ['work', 'casual'],
        palette: 'neutral',
        calibrationCompleted: false,
      };
      return deps.styleProfileRepository.saveStyleProfile(profile);
    },

    async updateStyleProfile(
      userId: string,
      patch: Partial<StyleProfile>,
    ): Promise<StyleProfile> {
      const existing = await deps.styleProfileRepository.findStyleProfile(userId);
      const updated: StyleProfile = {
        ...(existing ?? {
          styleProfileId: `sp-${userId}`,
          userId,
          archetype: 'classic',
          occasionPriorities: ['work', 'casual'],
          palette: 'neutral',
          calibrationCompleted: false,
        }),
        ...patch,
      };
      return deps.styleProfileRepository.saveStyleProfile(updated);
    },
  };
}

// ─── Item Digitization Use Case ──────────────────────────────────────────────

interface ItemDigitizationDeps {
  itemRepository: Pick<WardrobeRepository, 'saveItem' | 'findItemById' | 'deleteItem' | 'findItemsByUser' | 'getItemCount'>;
  aiProcessor: AIProcessorPort;
  imageStore: ImageStorePort;
  faceDetection: FaceDetectionPort;
  consentLog: ConsentLogPort;
}

export function createItemDigitizationUseCase(
  deps: ItemDigitizationDeps,
): ItemDigitizationPort {
  const pendingJobs = new Map<string, DigitizationJob>();

  return {
    async initiateDigitization(userId: string, photoUploadKey: string): Promise<DigitizationJob> {
      // Check for faces before submitting to AI
      const faceDetected = await deps.faceDetection.detectFace(photoUploadKey);

      if (faceDetected) {
        const job: DigitizationJob = {
          jobId: `job-${Date.now()}`,
          userId,
          photoUploadKey,
          status: 'failed',
          aiClassification: {
            backgroundRemovedUrl: '',
            category: '',
            subcategory: '',
            colorPrimary: '',
            seasons: [],
            occasions: [],
            confidence: 0,
            suggestedName: '',
            faceDetected: true,
          },
        };
        pendingJobs.set(job.jobId, job);
        return job;
      }

      // Submit to AI processor
      const classification = await deps.aiProcessor.processImage(photoUploadKey);

      const job: DigitizationJob = {
        jobId: `job-${Date.now()}`,
        userId,
        photoUploadKey,
        status: 'ready_for_review',
        aiClassification: classification,
      };
      pendingJobs.set(job.jobId, job);
      return job;
    },

    async confirmItem(userId: string, jobId: string, metadata: ItemMetadata): Promise<Item> {
      const job = pendingJobs.get(jobId);
      if (!job || job.userId !== userId) {
        throw new Error(`Digitization job not found: ${jobId}`);
      }

      const itemId = `item-${Date.now()}`;
      const photoKey = job.photoUploadKey;

      // Store image and get CDN URLs
      const { thumbnailUrl, originalUrl } = await deps.imageStore.storeImage(
        userId,
        itemId,
        Buffer.from(photoKey), // In real implementation: actual photo buffer
      );

      const item: Item = {
        itemId,
        userId,
        wardrobeId: `wardrobe-${userId}`,
        name: metadata.name,
        colorPrimary: metadata.colorPrimary,
        category: metadata.category,
        subcategory: metadata.subcategory,
        seasons: metadata.seasons,
        occasions: metadata.occasions,
        photoUrlThumbnail: thumbnailUrl,
        photoUrlOriginal: originalUrl,
        aiConfidence: job.aiClassification?.confidence,
        manualClassification: false,
        status: 'active',
        createdAt: new Date(),
      };

      const saved = await deps.itemRepository.saveItem(item);
      pendingJobs.set(jobId, { ...job, status: 'confirmed' });
      return saved;
    },

    async correctMetadata(
      userId: string,
      itemId: string,
      corrections: Partial<ItemMetadata>,
    ): Promise<Item> {
      const existing = await deps.itemRepository.findItemById(userId, itemId);
      if (!existing) {
        throw new Error(`Item not found: ${itemId}`);
      }
      const corrected: Item = { ...existing, ...corrections, manualClassification: true };
      return deps.itemRepository.saveItem(corrected);
    },

    async deleteItem(userId: string, itemId: string): Promise<void> {
      return deps.itemRepository.deleteItem(userId, itemId);
    },
  };
}

// ─── Outfit Suggestion Use Case ───────────────────────────────────────────────

interface OutfitSuggestionDeps {
  itemRepository: Pick<WardrobeRepository, 'findItemsByUser' | 'findItemById' | 'getItemCount'>;
  outfitRepository: Pick<WardrobeRepository, 'saveOutfitSuggestion' | 'findRecentOutfits'>;
  wearEventRepository: Pick<WardrobeRepository, 'saveWearEvent' | 'findWearEvents'>;
  styleProfileRepository: Pick<WardrobeRepository, 'findStyleProfile'>;
  weatherService: WeatherServicePort;
}

export function createOutfitSuggestionUseCase(
  deps: OutfitSuggestionDeps,
): OutfitSuggestionPort {
  return {
    async getDailyOutfit(
      userId: string,
      date: Date,
      occasionOverride?: string,
    ): Promise<OutfitSuggestion> {
      const itemCount = await deps.itemRepository.getItemCount(userId);

      // BR-01: No suggestion until wardrobe.item_count >= 5
      if (itemCount < 5) {
        throw new Error('INSUFFICIENT_ITEMS: wardrobe requires at least 5 items for outfit suggestions');
      }

      const styleProfile = await deps.styleProfileRepository.findStyleProfile(userId);
      const targetOccasion = occasionOverride
        ?? styleProfile?.occasionPriorities[0]
        ?? 'casual';

      // Fetch weather context — null on failure (graceful degradation)
      const weatherContext = await deps.weatherService.getTodaysForecast('Milan', date).catch(() => null);

      // Fetch items and apply occasion filter
      const allItems = await deps.itemRepository.findItemsByUser(userId);
      const occasionItems = allItems.filter((i) =>
        i.occasions.includes(targetOccasion.toLowerCase()),
      );
      const candidateItems = occasionItems.length >= 3 ? occasionItems : allItems;

      // Apply rotation constraint: BR-04
      const recentOutfits = await deps.outfitRepository.findRecentOutfits(
        userId,
        itemCount >= 15 ? 7 : 3,
      );
      const recentItemSets = recentOutfits.map((o) => new Set(o.itemIds));

      // Select items (simplified — real implementation uses ranking algorithm)
      const selectedItems = candidateItems.slice(0, Math.min(4, candidateItems.length));
      const selectedIds = selectedItems.map((i) => i.itemId);

      // Check rotation constraint
      const isRepeat = recentItemSets.some((previousSet) => {
        return (
          selectedIds.length === previousSet.size &&
          selectedIds.every((id) => previousSet.has(id))
        );
      });

      // If repeat and wardrobe is large enough, shift selection
      const finalItems = isRepeat && allItems.length > selectedItems.length
        ? allItems.slice(1, Math.min(5, allItems.length))
        : selectedItems;

      const outfit: OutfitSuggestion = {
        outfitId: `outfit-${Date.now()}`,
        userId,
        itemIds: finalItems.map((i) => i.itemId),
        items: finalItems,
        occasion: targetOccasion,
        weatherContext,
        reasoning: buildReasoning(targetOccasion, weatherContext),
        generatedAt: new Date(),
        suggestionDate: date,
        status: 'active',
      };

      return deps.outfitRepository.saveOutfitSuggestion(outfit);
    },

    async generateOutfitForItem(userId: string, focusItemId: string): Promise<OutfitSuggestion> {
      const focusItem = await deps.itemRepository.findItemById(userId, focusItemId);
      if (!focusItem) {
        throw new Error(`Item not found: ${focusItemId}`);
      }

      const allItems = await deps.itemRepository.findItemsByUser(userId);
      const otherItems = allItems.filter((i) => i.itemId !== focusItemId);

      // Focus item is always first (BR-03: outfit must have >= 3 items)
      const selectedItems = [focusItem, ...otherItems.slice(0, 3)];

      const weatherContext = await deps.weatherService
        .getTodaysForecast('Milan', new Date())
        .catch(() => null);

      const outfit: OutfitSuggestion = {
        outfitId: `outfit-${Date.now()}`,
        userId,
        itemIds: selectedItems.map((i) => i.itemId),
        items: selectedItems,
        occasion: focusItem.occasions[0] ?? 'casual',
        weatherContext,
        reasoning: `An outfit built around your ${focusItem.name}.`,
        generatedAt: new Date(),
        suggestionDate: new Date(),
        status: 'active',
      };

      return deps.outfitRepository.saveOutfitSuggestion(outfit);
    },

    async acceptOutfit(
      userId: string,
      outfitId: string,
      finalItemIds: string[],
    ): Promise<WearEvent> {
      // BR-05: WearEvent created only on explicit accept, not on view
      const wearEvent: WearEvent = {
        wearEventId: `wear-${Date.now()}`,
        userId,
        outfitId,
        itemsWorn: finalItemIds,
        wornDate: new Date(),
        createdAt: new Date(),
      };
      return deps.wearEventRepository.saveWearEvent(wearEvent);
    },

    async swapItem(
      userId: string,
      outfitId: string,
      removeItemId: string,
      addItemId: string,
    ): Promise<OutfitPreview> {
      const newItem = await deps.itemRepository.findItemById(userId, addItemId);
      if (!newItem) {
        throw new Error(`Replacement item not found: ${addItemId}`);
      }

      // Return ephemeral preview — outfit_suggestion is immutable (BR-05 adjacent)
      return {
        outfitId,
        items: [newItem], // Simplified: real impl replaces specific item in item list
        occasion: 'work',
        weatherContext: null,
      };
    },
  };
}

function buildReasoning(occasion: string, weather: { tempCelsius: number; condition: string } | null): string {
  if (weather) {
    return `A ${occasion} outfit suited to ${weather.tempCelsius}°C and ${weather.condition.replace('_', ' ')} conditions.`;
  }
  return `A curated ${occasion} outfit from your wardrobe.`;
}

// ─── Wardrobe Query Use Case ──────────────────────────────────────────────────

interface WardrobeQueryDeps {
  itemRepository: Pick<WardrobeRepository, 'findItemsByUser' | 'findItemById' | 'getItemCount'>;
  wearEventRepository: Pick<WardrobeRepository, 'findWearEvents'>;
}

export function createWardrobeQueryUseCase(deps: WardrobeQueryDeps): WardrobeQueryPort {
  return {
    async getWardrobeGrid(userId: string, _filters?: WardrobeFilters): Promise<Item[]> {
      return deps.itemRepository.findItemsByUser(userId);
    },

    async getWardrobeStats(userId: string): Promise<WardrobeStats> {
      const items = await deps.itemRepository.findItemsByUser(userId);
      const totalItems = items.length;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const wearEvents = await deps.wearEventRepository.findWearEvents(userId, thirtyDaysAgo);
      const wornItemIds = new Set(wearEvents.flatMap((e) => e.itemsWorn));

      const eligibleItems = items.filter(
        (i) => i.createdAt < fourteenDaysAgo,
      );
      const unwornEligibleItems = eligibleItems.filter(
        (i) => !wornItemIds.has(i.itemId),
      );

      // Eligibility gate: >= 15 items AND user has account >= 7 days
      // Account age is approximated here; real impl reads user.created_at
      const eligibleForStats = totalItems >= 15;

      return {
        totalItems,
        unwornThisMonth: unwornEligibleItems.length,
        eligibleForStats,
      };
    },

    async getUnwornItems(userId: string): Promise<Item[]> {
      const items = await deps.itemRepository.findItemsByUser(userId);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const wearEvents = await deps.wearEventRepository.findWearEvents(userId, thirtyDaysAgo);
      const wornItemIds = new Set(wearEvents.flatMap((e) => e.itemsWorn));

      return items
        .filter(
          (i) => !wornItemIds.has(i.itemId) && i.createdAt < fourteenDaysAgo,
        )
        .sort((a, b) => {
          const aTime = a.lastWornAt?.getTime() ?? 0;
          const bTime = b.lastWornAt?.getTime() ?? 0;
          return aTime - bTime; // Oldest worn first
        });
    },

    async getItemById(userId: string, itemId: string): Promise<Item> {
      const item = await deps.itemRepository.findItemById(userId, itemId);
      if (!item) throw new Error(`Item not found: ${itemId}`);
      return item;
    },

    async getAlternativesForCategory(userId: string, category: string): Promise<Item[]> {
      const items = await deps.itemRepository.findItemsByUser(userId);
      return items.filter((i) => i.category.toLowerCase() === category.toLowerCase());
    },
  };
}
