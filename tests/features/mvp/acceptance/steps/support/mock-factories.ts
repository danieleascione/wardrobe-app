import {
  MockAIProcessorPort,
  MockWeatherServicePort,
  MockImageStorePort,
  MockFaceDetectionPort,
  MockConsentLogPort,
  WardrobeRepository,
  AIClassificationResult,
  WeatherContext,
  Item,
  StyleProfile,
  OutfitSuggestion,
  WearEvent,
  ConsentRecord,
} from '../world';

// ─── In-Memory Wardrobe Repository ──────────────────────────────────────────

export function createInMemoryWardrobeRepository(): WardrobeRepository {
  const items = new Map<string, Item>();
  const styleProfiles = new Map<string, StyleProfile>();
  const outfitSuggestions: OutfitSuggestion[] = [];
  const wearEvents: WearEvent[] = [];

  return {
    async saveItem(item: Item): Promise<Item> {
      items.set(item.itemId, item);
      return item;
    },

    async findItemsByUser(userId: string): Promise<Item[]> {
      return Array.from(items.values()).filter(
        (i) => i.userId === userId && i.status === 'active',
      );
    },

    async findItemById(userId: string, itemId: string): Promise<Item | null> {
      const item = items.get(itemId);
      return item && item.userId === userId ? item : null;
    },

    async deleteItem(userId: string, itemId: string): Promise<void> {
      const item = items.get(itemId);
      if (item && item.userId === userId) {
        items.set(itemId, { ...item, status: 'deleted' });
      }
    },

    async getItemCount(userId: string): Promise<number> {
      return Array.from(items.values()).filter(
        (i) => i.userId === userId && i.status === 'active',
      ).length;
    },

    async saveStyleProfile(profile: StyleProfile): Promise<StyleProfile> {
      styleProfiles.set(profile.userId, profile);
      return profile;
    },

    async findStyleProfile(userId: string): Promise<StyleProfile | null> {
      return styleProfiles.get(userId) ?? null;
    },

    async saveOutfitSuggestion(outfit: OutfitSuggestion): Promise<OutfitSuggestion> {
      outfitSuggestions.push(outfit);
      return outfit;
    },

    async findRecentOutfits(userId: string, dayWindow: number): Promise<OutfitSuggestion[]> {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - dayWindow);
      return outfitSuggestions.filter(
        (o) => o.userId === userId && o.generatedAt >= cutoff,
      );
    },

    async saveWearEvent(event: WearEvent): Promise<WearEvent> {
      wearEvents.push(event);
      return event;
    },

    async findWearEvents(userId: string, sinceDate: Date): Promise<WearEvent[]> {
      return wearEvents.filter(
        (e) => e.userId === userId && e.wornDate >= sinceDate,
      );
    },
  };
}

// ─── Mock AI Processor ───────────────────────────────────────────────────────

export function createMockAIProcessorAdapter(): MockAIProcessorPort {
  let configuredResponse: Partial<AIClassificationResult> = defaultAIClassification();
  let isUnavailable = false;
  let callCount = 0;

  return {
    async processImage(_photoKey: string): Promise<AIClassificationResult> {
      callCount++;
      if (isUnavailable) {
        throw new Error('AI service unavailable');
      }
      return { ...defaultAIClassification(), ...configuredResponse };
    },

    configureResponse(result: Partial<AIClassificationResult>): void {
      isUnavailable = false;
      configuredResponse = result;
    },

    configureUnavailable(): void {
      isUnavailable = true;
    },

    getCallCount(): number {
      return callCount;
    },
  };
}

function defaultAIClassification(): AIClassificationResult {
  return {
    backgroundRemovedUrl: 'https://cdn.pocketwardrobe.com/test-user/test-item/bg-removed.webp',
    category: 'Outerwear',
    subcategory: 'Coat',
    colorPrimary: 'Camel / Warm tan',
    seasons: ['spring', 'autumn', 'winter'],
    occasions: ['work', 'casual'],
    confidence: 0.92,
    suggestedName: 'Camel Wool Coat',
    faceDetected: false,
  };
}

// ─── Mock Weather Service ────────────────────────────────────────────────────

export function createMockWeatherServiceAdapter(): MockWeatherServicePort {
  let configuredContext: WeatherContext = defaultWeatherContext();
  let isUnavailable = false;

  return {
    async getTodaysForecast(_city: string, _date: Date): Promise<WeatherContext | null> {
      if (isUnavailable) {
        return null;
      }
      return { ...configuredContext };
    },

    configureResponse(context: WeatherContext): void {
      isUnavailable = false;
      configuredContext = context;
    },

    configureUnavailable(): void {
      isUnavailable = true;
    },
  };
}

function defaultWeatherContext(): WeatherContext {
  return {
    city: 'Milan',
    date: new Date(),
    tempCelsius: 12,
    condition: 'partly_cloudy',
  };
}

// ─── Mock Image Store ────────────────────────────────────────────────────────

export function createMockImageStoreAdapter(): MockImageStorePort {
  const storedImages = new Map<string, { thumbnailUrl: string; originalUrl: string }>();

  return {
    async storeImage(
      userId: string,
      itemId: string,
      _photoBuffer: Buffer,
    ): Promise<{ thumbnailUrl: string; originalUrl: string }> {
      const result = {
        thumbnailUrl: `https://cdn.pocketwardrobe.com/${userId}/${itemId}/thumb.webp`,
        originalUrl: `s3://pocket-wardrobe-prod/${userId}/${itemId}/original.jpg`,
      };
      storedImages.set(itemId, result);
      return result;
    },

    getStoredImages(): Map<string, { thumbnailUrl: string; originalUrl: string }> {
      return storedImages;
    },
  };
}

// ─── Mock Face Detection ─────────────────────────────────────────────────────

export function createMockFaceDetectionAdapter(): MockFaceDetectionPort {
  let faceDetected = false;

  return {
    async detectFace(_photoKey: string): Promise<boolean> {
      return faceDetected;
    },

    configureFaceDetected(detected: boolean): void {
      faceDetected = detected;
    },
  };
}

// ─── Mock Consent Log ────────────────────────────────────────────────────────

export function createMockConsentLogAdapter(): MockConsentLogPort {
  const recordedConsents: ConsentRecord[] = [];

  return {
    async recordConsent(
      userId: string,
      consentType: string,
      consentVersion: string,
    ): Promise<ConsentRecord> {
      const record: ConsentRecord = {
        consentId: `consent-${Date.now()}`,
        userId,
        consentType,
        consentVersion,
        grantedAt: new Date(),
      };
      recordedConsents.push(record);
      return record;
    },

    async revokeConsent(
      userId: string,
      consentType: string,
      _consentVersion: string,
    ): Promise<void> {
      const record = recordedConsents.find(
        (r) => r.userId === userId && r.consentType === consentType && !r.revokedAt,
      );
      if (record) {
        record.revokedAt = new Date();
      }
    },

    getRecordedConsents(): ConsentRecord[] {
      return [...recordedConsents];
    },
  };
}
