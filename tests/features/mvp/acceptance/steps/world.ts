import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';

// ─── Inbound Port Interfaces (driving ports — tests invoke through these) ───

export interface StyleCalibrationPort {
  completeCalibration(
    userId: string,
    archetype: string,
    occasions: string[],
    palette: string,
  ): Promise<StyleProfile>;
  skipCalibration(userId: string): Promise<StyleProfile>;
  updateStyleProfile(userId: string, patch: Partial<StyleProfilePatch>): Promise<StyleProfile>;
}

export interface ItemDigitizationPort {
  initiateDigitization(userId: string, photoUploadKey: string): Promise<DigitizationJob>;
  confirmItem(userId: string, jobId: string, metadata: ItemMetadata): Promise<Item>;
  correctMetadata(userId: string, itemId: string, corrections: Partial<ItemMetadata>): Promise<Item>;
  deleteItem(userId: string, itemId: string): Promise<void>;
}

export interface OutfitSuggestionPort {
  getDailyOutfit(userId: string, date: Date, occasionOverride?: string): Promise<OutfitSuggestion>;
  generateOutfitForItem(userId: string, focusItemId: string): Promise<OutfitSuggestion>;
  acceptOutfit(userId: string, outfitId: string, finalItemIds: string[]): Promise<WearEvent>;
  swapItem(
    userId: string,
    outfitId: string,
    removeItemId: string,
    addItemId: string,
  ): Promise<OutfitPreview>;
}

export interface WardrobeQueryPort {
  getWardrobeGrid(userId: string, filters?: WardrobeFilters): Promise<Item[]>;
  getWardrobeStats(userId: string): Promise<WardrobeStats>;
  getUnwornItems(userId: string): Promise<Item[]>;
  getItemById(userId: string, itemId: string): Promise<Item>;
  getAlternativesForCategory(userId: string, category: string): Promise<Item[]>;
}

// ─── Outbound Port Interfaces (mocked in tests) ─────────────────────────────

export interface AIProcessorPort {
  processImage(photoKey: string): Promise<AIClassificationResult>;
}

export interface WeatherServicePort {
  getTodaysForecast(city: string, date: Date): Promise<WeatherContext | null>;
}

export interface ImageStorePort {
  storeImage(
    userId: string,
    itemId: string,
    photoBuffer: Buffer,
  ): Promise<{ thumbnailUrl: string; originalUrl: string }>;
}

export interface FaceDetectionPort {
  detectFace(photoKey: string): Promise<boolean>;
}

export interface ConsentLogPort {
  recordConsent(userId: string, consentType: string, consentVersion: string): Promise<ConsentRecord>;
  revokeConsent(userId: string, consentType: string, consentVersion: string): Promise<void>;
}

export interface WardrobeRepository {
  saveItem(item: Item): Promise<Item>;
  findItemsByUser(userId: string): Promise<Item[]>;
  findItemById(userId: string, itemId: string): Promise<Item | null>;
  deleteItem(userId: string, itemId: string): Promise<void>;
  getItemCount(userId: string): Promise<number>;
  saveStyleProfile(profile: StyleProfile): Promise<StyleProfile>;
  findStyleProfile(userId: string): Promise<StyleProfile | null>;
  saveOutfitSuggestion(outfit: OutfitSuggestion): Promise<OutfitSuggestion>;
  findRecentOutfits(userId: string, dayWindow: number): Promise<OutfitSuggestion[]>;
  saveWearEvent(event: WearEvent): Promise<WearEvent>;
  findWearEvents(userId: string, sinceDate: Date): Promise<WearEvent[]>;
}

// ─── Domain Value Types ──────────────────────────────────────────────────────

export interface StyleProfile {
  styleProfileId: string;
  userId: string;
  archetype: string;
  occasionPriorities: string[];
  palette: string;
  calibrationCompleted: boolean;
}

export interface StyleProfilePatch {
  archetype: string;
  occasionPriorities: string[];
  palette: string;
}

export interface Item {
  itemId: string;
  userId: string;
  wardrobeId: string;
  name: string;
  colorPrimary: string;
  category: string;
  subcategory: string;
  seasons: string[];
  occasions: string[];
  photoUrlThumbnail: string;
  photoUrlOriginal: string;
  aiConfidence?: number;
  manualClassification: boolean;
  status: 'active' | 'pending_ai' | 'pending_review' | 'deleted';
  lastWornAt?: Date;
  createdAt: Date;
}

export interface ItemMetadata {
  name: string;
  colorPrimary: string;
  category: string;
  subcategory: string;
  seasons: string[];
  occasions: string[];
}

export interface DigitizationJob {
  jobId: string;
  userId: string;
  photoUploadKey: string;
  status: 'processing' | 'ready_for_review' | 'confirmed' | 'failed';
  aiClassification?: AIClassificationResult;
}

export interface AIClassificationResult {
  backgroundRemovedUrl: string;
  category: string;
  subcategory: string;
  colorPrimary: string;
  seasons: string[];
  occasions: string[];
  confidence: number;
  suggestedName: string;
  faceDetected: boolean;
}

export interface WeatherContext {
  city: string;
  date: Date;
  tempCelsius: number;
  condition: string;
}

export interface OutfitSuggestion {
  outfitId: string;
  userId: string;
  itemIds: string[];
  items: Item[];
  occasion: string;
  weatherContext: WeatherContext | null;
  reasoning: string;
  generatedAt: Date;
  suggestionDate: Date;
  status: 'active' | 'invalidated';
}

export interface OutfitPreview {
  outfitId: string;
  items: Item[];
  occasion: string;
  weatherContext: WeatherContext | null;
}

export interface WearEvent {
  wearEventId: string;
  userId: string;
  outfitId: string;
  itemsWorn: string[];
  wornDate: Date;
  createdAt: Date;
}

export interface WardrobeStats {
  totalItems: number;
  unwornThisMonth: number;
  eligibleForStats: boolean;
}

export interface WardrobeFilters {
  occasion?: string;
  season?: string;
  category?: string;
}

export interface ConsentRecord {
  consentId: string;
  userId: string;
  consentType: string;
  consentVersion: string;
  grantedAt: Date;
  revokedAt?: Date;
}

// ─── Mock Adapter Interfaces ─────────────────────────────────────────────────

export interface MockAIProcessorPort extends AIProcessorPort {
  configureResponse(result: Partial<AIClassificationResult>): void;
  configureUnavailable(): void;
  getCallCount(): number;
}

export interface MockWeatherServicePort extends WeatherServicePort {
  configureResponse(context: WeatherContext): void;
  configureUnavailable(): void;
}

export interface MockImageStorePort extends ImageStorePort {
  getStoredImages(): Map<string, { thumbnailUrl: string; originalUrl: string }>;
}

export interface MockFaceDetectionPort extends FaceDetectionPort {
  configureFaceDetected(detected: boolean): void;
}

export interface MockConsentLogPort extends ConsentLogPort {
  getRecordedConsents(): ConsentRecord[];
}

// ─── Test User Builder ───────────────────────────────────────────────────────

export interface TestUser {
  userId: string;
  wardrobeId: string;
  name: string;
  city: string;
  accountCreatedAt: Date;
}

export function buildTestUser(overrides: Partial<TestUser> = {}): TestUser {
  return {
    userId: `test-user-${Date.now()}`,
    wardrobeId: `test-wardrobe-${Date.now()}`,
    name: 'Sofia',
    city: 'Milan',
    accountCreatedAt: new Date(),
    ...overrides,
  };
}

export function buildTestItem(userId: string, overrides: Partial<Item> = {}): Item {
  const itemId = `test-item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return {
    itemId,
    userId,
    wardrobeId: `wardrobe-${userId}`,
    name: 'Test Garment',
    colorPrimary: 'White',
    category: 'Tops',
    subcategory: 'Blouse',
    seasons: ['spring', 'summer'],
    occasions: ['casual'],
    photoUrlThumbnail: `https://cdn.pocketwardrobe.com/${userId}/${itemId}/thumb.webp`,
    photoUrlOriginal: `s3://pocket-wardrobe-prod/${userId}/${itemId}/original.jpg`,
    manualClassification: false,
    status: 'active',
    createdAt: new Date(),
    ...overrides,
  };
}

// ─── PocketWardrobe Test World ───────────────────────────────────────────────

export class PocketWardrobeWorld extends World {
  // Current test user
  currentUser: TestUser;

  // Inbound ports (use cases) — injected with mock outbound adapters
  ports: {
    styleCalibration: StyleCalibrationPort;
    itemDigitization: ItemDigitizationPort;
    outfitSuggestion: OutfitSuggestionPort;
    wardrobeQuery: WardrobeQueryPort;
  };

  // Mock outbound adapters — configured per scenario
  mocks: {
    aiProcessor: MockAIProcessorPort;
    weatherService: MockWeatherServicePort;
    imageStore: MockImageStorePort;
    faceDetection: MockFaceDetectionPort;
    consentLog: MockConsentLogPort;
    wardrobeRepository: WardrobeRepository;
  };

  // Test scenario state — accumulated across steps
  scenarioState: {
    lastStyleProfile?: StyleProfile;
    lastDigitizationJob?: DigitizationJob;
    lastConfirmedItem?: Item;
    lastOutfitSuggestion?: OutfitSuggestion;
    lastWearEvent?: WearEvent;
    lastOutfitPreview?: OutfitPreview;
    confirmedItems: Item[];
    thrownError?: Error;
  };

  constructor(options: IWorldOptions) {
    super(options);

    this.currentUser = buildTestUser();

    this.scenarioState = {
      confirmedItems: [],
    };

    // Ports and mocks are wired in support/hooks.ts before each scenario.
    // Using null-object pattern here to prevent accidental undefined access.
    this.ports = {} as typeof this.ports;
    this.mocks = {} as typeof this.mocks;
  }

  // ─── Convenience helpers ─────────────────────────────────────────────────

  async addConfirmedItemToWardrobe(overrides: Partial<Item> = {}): Promise<Item> {
    const item = buildTestItem(this.currentUser.userId, { status: 'active', ...overrides });
    const savedItem = await this.mocks.wardrobeRepository.saveItem(item);
    this.scenarioState.confirmedItems.push(savedItem);
    return savedItem;
  }

  async buildWardrobeWithItems(
    count: number,
    overrides: Partial<Item> = {},
  ): Promise<Item[]> {
    const items: Item[] = [];
    for (let i = 0; i < count; i++) {
      const item = await this.addConfirmedItemToWardrobe({
        name: `Test Item ${i + 1}`,
        ...overrides,
      });
      items.push(item);
    }
    return items;
  }
}

setWorldConstructor(PocketWardrobeWorld);
