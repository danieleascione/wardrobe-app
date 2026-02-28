/**
 * Port Contract Tests — Step 01-02
 *
 * These tests verify that each outbound port interface has the correct shape
 * by creating in-line mock implementations. If TypeScript compilation passes,
 * the contracts are satisfied. Runtime assertions confirm the mock objects
 * satisfy the interfaces at the type level.
 *
 * Port-to-port testing principle: we exercise the driving port (the interface
 * contract itself) — not any internal implementation.
 */

import { describe, it, expect } from 'vitest';

// ── Domain types ──────────────────────────────────────────────────────────────
import type { Item } from '../../../entities/Item.js';
import type { Wardrobe } from '../../../entities/Wardrobe.js';
import type { Outfit } from '../../../entities/Outfit.js';
import type { WearEvent } from '../../../entities/WearEvent.js';
import type { StyleProfile } from '../../../entities/StyleProfile.js';
import type { AIClassification, WeatherContext } from '../../../value-objects/index.js';

// ── Port interfaces under test ────────────────────────────────────────────────
import type { ItemRepositoryPort } from '../ItemRepositoryPort.js';
import type { WardrobeRepositoryPort } from '../WardrobeRepositoryPort.js';
import type { OutfitRepositoryPort } from '../OutfitRepositoryPort.js';
import type { WearEventRepositoryPort } from '../WearEventRepositoryPort.js';
import type { StyleProfileRepositoryPort } from '../StyleProfileRepositoryPort.js';
import type { AIProcessorPort } from '../AIProcessorPort.js';
import type { WeatherServicePort } from '../WeatherServicePort.js';
import type { ConsentLogPort } from '../ConsentLogPort.js';
import type { ImageStorePort } from '../ImageStorePort.js';
import type { AIQualityLogPort } from '../AIQualityLogPort.js';

// ── Mock implementations — satisfy interface shapes ───────────────────────────

const mockItemRepo: ItemRepositoryPort = {
  save: (_item: Item): Promise<void> => Promise.resolve(),
  findById: (_itemId: string): Promise<Item | null> => Promise.resolve(null),
  findByWardrobe: (_wardrobeId: string): Promise<Item[]> => Promise.resolve([]),
  delete: (_itemId: string): Promise<void> => Promise.resolve(),
  findByOccasionAndSeason: (
    _wardrobeId: string,
    _occasion: string,
    _season: string,
  ): Promise<Item[]> => Promise.resolve([]),
};

const mockWardrobeRepo: WardrobeRepositoryPort = {
  findByUserId: (_userId: string): Promise<Wardrobe | null> => Promise.resolve(null),
  updateItemCount: (_wardrobeId: string, _delta: number): Promise<void> => Promise.resolve(),
};

const mockOutfitRepo: OutfitRepositoryPort = {
  save: (_outfit: Outfit): Promise<void> => Promise.resolve(),
  findByUserId: (_userId: string): Promise<Outfit[]> => Promise.resolve([]),
  findByDateWindow: (
    _userId: string,
    _startDate: string,
    _endDate: string,
  ): Promise<Outfit[]> => Promise.resolve([]),
};

const mockWearEventRepo: WearEventRepositoryPort = {
  save: (_wearEvent: WearEvent): Promise<void> => Promise.resolve(),
  findByItemId: (_itemId: string): Promise<WearEvent[]> => Promise.resolve([]),
};

const mockStyleProfileRepo: StyleProfileRepositoryPort = {
  save: (_profile: StyleProfile): Promise<void> => Promise.resolve(),
  findByUserId: (_userId: string): Promise<StyleProfile | null> => Promise.resolve(null),
};

const mockAIProcessor: AIProcessorPort = {
  processImage: (
    _imageBuffer: Buffer,
  ): Promise<{ classification: AIClassification; backgroundRemovedUrl: string }> =>
    Promise.resolve({
      classification: {} as AIClassification,
      backgroundRemovedUrl: 'https://example.com/bg-removed.jpg',
    }),
};

const mockWeatherService: WeatherServicePort = {
  fetchForecast: (_city: string, _date: string): Promise<WeatherContext | null> =>
    Promise.resolve(null),
};

const mockConsentLog: ConsentLogPort = {
  logConsent: (_userId: string, _granted: boolean): Promise<void> => Promise.resolve(),
  isConsentGranted: (_userId: string): Promise<boolean> => Promise.resolve(false),
};

const mockImageStore: ImageStorePort = {
  store: (_key: string, _buffer: Buffer): Promise<string> =>
    Promise.resolve('https://example.com/stored.jpg'),
  delete: (_key: string): Promise<void> => Promise.resolve(),
};

const mockAIQualityLog: AIQualityLogPort = {
  logCorrection: (
    _itemId: string,
    _predicted: AIClassification,
    _corrected: AIClassification,
  ): Promise<void> => Promise.resolve(),
};

// ── Contract tests ────────────────────────────────────────────────────────────

describe('Outbound Port Contracts', () => {
  describe('ItemRepositoryPort', () => {
    it('satisfies interface shape: save, findById, findByWardrobe, delete, findByOccasionAndSeason', () => {
      expect(typeof mockItemRepo.save).toBe('function');
      expect(typeof mockItemRepo.findById).toBe('function');
      expect(typeof mockItemRepo.findByWardrobe).toBe('function');
      expect(typeof mockItemRepo.delete).toBe('function');
      expect(typeof mockItemRepo.findByOccasionAndSeason).toBe('function');
    });
  });

  describe('WardrobeRepositoryPort', () => {
    it('satisfies interface shape: findByUserId, updateItemCount', () => {
      expect(typeof mockWardrobeRepo.findByUserId).toBe('function');
      expect(typeof mockWardrobeRepo.updateItemCount).toBe('function');
    });
  });

  describe('OutfitRepositoryPort', () => {
    it('satisfies interface shape: save, findByUserId, findByDateWindow', () => {
      expect(typeof mockOutfitRepo.save).toBe('function');
      expect(typeof mockOutfitRepo.findByUserId).toBe('function');
      expect(typeof mockOutfitRepo.findByDateWindow).toBe('function');
    });
  });

  describe('WearEventRepositoryPort', () => {
    it('satisfies interface shape: save, findByItemId', () => {
      expect(typeof mockWearEventRepo.save).toBe('function');
      expect(typeof mockWearEventRepo.findByItemId).toBe('function');
    });
  });

  describe('StyleProfileRepositoryPort', () => {
    it('satisfies interface shape: save, findByUserId', () => {
      expect(typeof mockStyleProfileRepo.save).toBe('function');
      expect(typeof mockStyleProfileRepo.findByUserId).toBe('function');
    });
  });

  describe('AIProcessorPort', () => {
    it('satisfies interface shape: processImage returning classification and backgroundRemovedUrl', () => {
      expect(typeof mockAIProcessor.processImage).toBe('function');
    });

    it('processImage returns AIClassification and background-removed URL', async () => {
      const result = await mockAIProcessor.processImage(Buffer.from('test'));
      expect(result).toHaveProperty('classification');
      expect(result).toHaveProperty('backgroundRemovedUrl');
      expect(typeof result.backgroundRemovedUrl).toBe('string');
    });
  });

  describe('WeatherServicePort', () => {
    it('satisfies interface shape: fetchForecast returning WeatherContext or null', () => {
      expect(typeof mockWeatherService.fetchForecast).toBe('function');
    });

    it('fetchForecast gracefully returns null when forecast unavailable', async () => {
      const result = await mockWeatherService.fetchForecast('London', '2026-02-28');
      expect(result).toBeNull();
    });
  });

  describe('ConsentLogPort', () => {
    it('satisfies interface shape: logConsent and isConsentGranted', () => {
      expect(typeof mockConsentLog.logConsent).toBe('function');
      expect(typeof mockConsentLog.isConsentGranted).toBe('function');
    });
  });

  describe('ImageStorePort', () => {
    it('satisfies interface shape: store returning url, delete', () => {
      expect(typeof mockImageStore.store).toBe('function');
      expect(typeof mockImageStore.delete).toBe('function');
    });
  });

  describe('AIQualityLogPort', () => {
    it('satisfies interface shape: logCorrection', () => {
      expect(typeof mockAIQualityLog.logCorrection).toBe('function');
    });
  });
});
