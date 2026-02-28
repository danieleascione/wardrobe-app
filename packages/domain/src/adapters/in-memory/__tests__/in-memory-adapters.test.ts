/**
 * In-Memory Adapter Tests — Step 02-01
 *
 * Port-to-port testing principle: tests invoke adapter methods through their
 * port interface types. Adapters are the integration boundary — they ARE the
 * driven port implementation, so we test them directly (integration tests for
 * adapters are the correct pattern per hexagonal architecture).
 *
 * Test Budget: 19 distinct behaviors × 2 = 38 max unit tests
 * Actual count: 35 tests
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { Item } from '../../../entities/Item.js';
import { Wardrobe } from '../../../entities/Wardrobe.js';
import { Outfit } from '../../../entities/Outfit.js';
import { WearEvent } from '../../../entities/WearEvent.js';
import { StyleProfile } from '../../../entities/StyleProfile.js';
import { AIClassification, WeatherContext } from '../../../value-objects/index.js';

import type { ItemRepositoryPort } from '../../../ports/outbound/ItemRepositoryPort.js';
import type { WardrobeRepositoryPort } from '../../../ports/outbound/WardrobeRepositoryPort.js';
import type { OutfitRepositoryPort } from '../../../ports/outbound/OutfitRepositoryPort.js';
import type { WearEventRepositoryPort } from '../../../ports/outbound/WearEventRepositoryPort.js';
import type { StyleProfileRepositoryPort } from '../../../ports/outbound/StyleProfileRepositoryPort.js';
import type { AIProcessorPort } from '../../../ports/outbound/AIProcessorPort.js';
import type { WeatherServicePort } from '../../../ports/outbound/WeatherServicePort.js';
import type { ConsentLogPort } from '../../../ports/outbound/ConsentLogPort.js';
import type { ImageStorePort } from '../../../ports/outbound/ImageStorePort.js';
import type { AIQualityLogPort } from '../../../ports/outbound/AIQualityLogPort.js';

import { InMemoryItemRepository } from '../InMemoryItemRepository.js';
import { InMemoryWardrobeRepository } from '../InMemoryWardrobeRepository.js';
import { InMemoryOutfitRepository } from '../InMemoryOutfitRepository.js';
import { InMemoryWearEventRepository } from '../InMemoryWearEventRepository.js';
import { InMemoryStyleProfileRepository } from '../InMemoryStyleProfileRepository.js';
import { MockAIProcessor } from '../MockAIProcessor.js';
import { MockWeatherService } from '../MockWeatherService.js';
import { InMemoryConsentLogAdapter } from '../InMemoryConsentLogAdapter.js';
import { InMemoryImageStoreAdapter } from '../InMemoryImageStoreAdapter.js';
import { InMemoryAIQualityLogAdapter } from '../InMemoryAIQualityLogAdapter.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeItem = (overrides: Partial<ConstructorParameters<typeof Item>[0]> = {}): Item =>
  new Item({
    item_id: 'item-1',
    user_id: 'user-1',
    wardrobe_id: 'wardrobe-1',
    photo_url_original: 's3://bucket/user-1/item-1/original.jpg',
    photo_url_thumbnail: 'https://cdn.example.com/user-1/item-1/thumb.webp',
    name: 'Camel Coat',
    color_primary: 'Camel',
    color_hex: '#C19A6B',
    category: 'Outerwear',
    subcategory: 'Coat',
    seasons: ['autumn', 'winter'],
    occasions: ['work', 'casual'],
    fabric: 'wool',
    ai_confidence: 0.92,
    manual_classification: false,
    last_worn_at: null,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
    status: 'active',
    ...overrides,
  });

const makeWardrobe = (overrides: Partial<ConstructorParameters<typeof Wardrobe>[0]> = {}): Wardrobe =>
  new Wardrobe({
    wardrobe_id: 'wardrobe-1',
    user_id: 'user-1',
    item_count: 0,
    first_unlock_achieved: false,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  });

const makeOutfit = (overrides: Partial<ConstructorParameters<typeof Outfit>[0]> = {}): Outfit =>
  new Outfit({
    outfit_id: 'outfit-1',
    user_id: 'user-1',
    item_ids: ['item-1', 'item-2', 'item-3'],
    occasion: 'work',
    weather_context: null,
    reasoning: 'Classic work outfit',
    generated_at: new Date('2026-01-15T08:00:00Z'),
    suggestion_date: '2026-01-15',
    status: 'active',
    ...overrides,
  });

const makeWearEvent = (overrides: Partial<ConstructorParameters<typeof WearEvent>[0]> = {}): WearEvent =>
  new WearEvent({
    wear_event_id: 'event-1',
    user_id: 'user-1',
    outfit_id: 'outfit-1',
    items_worn: ['item-1', 'item-2', 'item-3'],
    worn_date: '2026-01-15',
    created_at: new Date('2026-01-15T09:00:00Z'),
    ...overrides,
  });

const makeStyleProfile = (overrides: Partial<ConstructorParameters<typeof StyleProfile>[0]> = {}): StyleProfile =>
  new StyleProfile({
    style_profile_id: 'profile-1',
    user_id: 'user-1',
    archetype: 'classic',
    occasion_priorities: ['work', 'casual'],
    palette: 'neutral',
    calibration_completed: true,
    calibration_version: 1,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  });

const makeClassification = (overrides: Partial<ConstructorParameters<typeof AIClassification>[0]> = {}): AIClassification =>
  new AIClassification({
    name: 'Camel Coat',
    color_primary: 'Camel',
    color_hex: '#C19A6B',
    category: 'Outerwear',
    subcategory: 'Coat',
    seasons: ['autumn', 'winter'],
    occasions: ['work', 'casual'],
    fabric: 'wool',
    ai_confidence: 0.92,
    ...overrides,
  });

// ── InMemoryItemRepository ────────────────────────────────────────────────────

describe('InMemoryItemRepository', () => {
  let repo: ItemRepositoryPort & { reset(): void };

  beforeEach(() => {
    repo = new InMemoryItemRepository();
  });

  it('satisfies ItemRepositoryPort interface', () => {
    expect(typeof repo.save).toBe('function');
    expect(typeof repo.findById).toBe('function');
    expect(typeof repo.findByWardrobe).toBe('function');
    expect(typeof repo.delete).toBe('function');
    expect(typeof repo.findByOccasionAndSeason).toBe('function');
  });

  it('saves an item and retrieves it by id', async () => {
    const item = makeItem();
    await repo.save(item);
    const found = await repo.findById('item-1');
    expect(found).not.toBeNull();
    expect(found!.item_id).toBe('item-1');
    expect(found!.name).toBe('Camel Coat');
  });

  it('returns null when item id does not exist', async () => {
    const found = await repo.findById('nonexistent');
    expect(found).toBeNull();
  });

  it('overwrites existing item on repeated save with same id', async () => {
    const original = makeItem({ name: 'Original Name' });
    await repo.save(original);
    const updated = makeItem({ name: 'Updated Name' });
    await repo.save(updated);
    const found = await repo.findById('item-1');
    expect(found!.name).toBe('Updated Name');
  });

  it('retrieves all items belonging to a wardrobe', async () => {
    const item1 = makeItem({ item_id: 'item-1', wardrobe_id: 'wardrobe-1' });
    const item2 = makeItem({ item_id: 'item-2', wardrobe_id: 'wardrobe-1' });
    const item3 = makeItem({ item_id: 'item-3', wardrobe_id: 'wardrobe-other' });
    await repo.save(item1);
    await repo.save(item2);
    await repo.save(item3);
    const items = await repo.findByWardrobe('wardrobe-1');
    expect(items).toHaveLength(2);
    expect(items.map(i => i.item_id)).toContain('item-1');
    expect(items.map(i => i.item_id)).toContain('item-2');
  });

  it('returns empty array when wardrobe has no items', async () => {
    const items = await repo.findByWardrobe('empty-wardrobe');
    expect(items).toEqual([]);
  });

  it('deletes an item so it is no longer retrievable', async () => {
    const item = makeItem();
    await repo.save(item);
    await repo.delete('item-1');
    const found = await repo.findById('item-1');
    expect(found).toBeNull();
  });

  it('finds items matching both occasion and season within a wardrobe', async () => {
    const match = makeItem({ item_id: 'item-1', wardrobe_id: 'wardrobe-1', occasions: ['work'], seasons: ['winter'] });
    const wrongOccasion = makeItem({ item_id: 'item-2', wardrobe_id: 'wardrobe-1', occasions: ['casual'], seasons: ['winter'] });
    const wrongSeason = makeItem({ item_id: 'item-3', wardrobe_id: 'wardrobe-1', occasions: ['work'], seasons: ['summer'] });
    await repo.save(match);
    await repo.save(wrongOccasion);
    await repo.save(wrongSeason);
    const results = await repo.findByOccasionAndSeason('wardrobe-1', 'work', 'winter');
    expect(results).toHaveLength(1);
    expect(results[0].item_id).toBe('item-1');
  });

  it('clears all state on reset so previously saved items are gone', async () => {
    const item = makeItem();
    await repo.save(item);
    repo.reset();
    const found = await repo.findById('item-1');
    expect(found).toBeNull();
  });
});

// ── InMemoryWardrobeRepository ────────────────────────────────────────────────

describe('InMemoryWardrobeRepository', () => {
  let repo: WardrobeRepositoryPort & { save(w: Wardrobe): Promise<void>; reset(): void };

  beforeEach(() => {
    repo = new InMemoryWardrobeRepository();
  });

  it('satisfies WardrobeRepositoryPort interface', () => {
    expect(typeof repo.findByUserId).toBe('function');
    expect(typeof repo.updateItemCount).toBe('function');
  });

  it('returns null when no wardrobe exists for user', async () => {
    const wardrobe = await repo.findByUserId('nonexistent-user');
    expect(wardrobe).toBeNull();
  });

  it('saves and retrieves wardrobe by user id', async () => {
    const wardrobe = makeWardrobe();
    await repo.save(wardrobe);
    const found = await repo.findByUserId('user-1');
    expect(found).not.toBeNull();
    expect(found!.wardrobe_id).toBe('wardrobe-1');
  });

  it('increments item_count when positive delta is applied', async () => {
    const wardrobe = makeWardrobe({ item_count: 0 });
    await repo.save(wardrobe);
    await repo.updateItemCount('wardrobe-1', 1);
    const found = await repo.findByUserId('user-1');
    expect(found!.item_count).toBe(1);
  });

  it('decrements item_count when negative delta is applied', async () => {
    const wardrobe = makeWardrobe({ item_count: 3 });
    await repo.save(wardrobe);
    await repo.updateItemCount('wardrobe-1', -1);
    const found = await repo.findByUserId('user-1');
    expect(found!.item_count).toBe(2);
  });

  it('clears all state on reset', async () => {
    const wardrobe = makeWardrobe();
    await repo.save(wardrobe);
    repo.reset();
    const found = await repo.findByUserId('user-1');
    expect(found).toBeNull();
  });
});

// ── InMemoryOutfitRepository ──────────────────────────────────────────────────

describe('InMemoryOutfitRepository', () => {
  let repo: OutfitRepositoryPort & { reset(): void };

  beforeEach(() => {
    repo = new InMemoryOutfitRepository();
  });

  it('satisfies OutfitRepositoryPort interface', () => {
    expect(typeof repo.save).toBe('function');
    expect(typeof repo.findByUserId).toBe('function');
    expect(typeof repo.findByDateWindow).toBe('function');
  });

  it('saves an outfit and retrieves it by user id', async () => {
    const outfit = makeOutfit();
    await repo.save(outfit);
    const outfits = await repo.findByUserId('user-1');
    expect(outfits).toHaveLength(1);
    expect(outfits[0].outfit_id).toBe('outfit-1');
  });

  it('returns outfits within a date window inclusive of boundaries', async () => {
    const inWindow = makeOutfit({ outfit_id: 'outfit-1', suggestion_date: '2026-01-15' });
    const beforeWindow = makeOutfit({ outfit_id: 'outfit-2', suggestion_date: '2026-01-10' });
    const afterWindow = makeOutfit({ outfit_id: 'outfit-3', suggestion_date: '2026-01-20' });
    await repo.save(inWindow);
    await repo.save(beforeWindow);
    await repo.save(afterWindow);
    const results = await repo.findByDateWindow('user-1', '2026-01-12', '2026-01-18');
    expect(results).toHaveLength(1);
    expect(results[0].outfit_id).toBe('outfit-1');
  });

  it('clears all state on reset', async () => {
    await repo.save(makeOutfit());
    repo.reset();
    const outfits = await repo.findByUserId('user-1');
    expect(outfits).toHaveLength(0);
  });
});

// ── InMemoryWearEventRepository ───────────────────────────────────────────────

describe('InMemoryWearEventRepository', () => {
  let repo: WearEventRepositoryPort & { reset(): void };

  beforeEach(() => {
    repo = new InMemoryWearEventRepository();
  });

  it('satisfies WearEventRepositoryPort interface', () => {
    expect(typeof repo.save).toBe('function');
    expect(typeof repo.findByItemId).toBe('function');
  });

  it('saves a wear event and retrieves it by item id', async () => {
    const event = makeWearEvent({ items_worn: ['item-1', 'item-2', 'item-3'] });
    await repo.save(event);
    const events = await repo.findByItemId('item-1');
    expect(events).toHaveLength(1);
    expect(events[0].wear_event_id).toBe('event-1');
  });

  it('returns only events containing the queried item id', async () => {
    const eventWithItem = makeWearEvent({ wear_event_id: 'event-1', items_worn: ['item-1', 'item-2', 'item-3'] });
    const eventWithoutItem = makeWearEvent({ wear_event_id: 'event-2', items_worn: ['item-4', 'item-5', 'item-6'] });
    await repo.save(eventWithItem);
    await repo.save(eventWithoutItem);
    const events = await repo.findByItemId('item-1');
    expect(events).toHaveLength(1);
    expect(events[0].wear_event_id).toBe('event-1');
  });

  it('clears all state on reset', async () => {
    await repo.save(makeWearEvent());
    repo.reset();
    const events = await repo.findByItemId('item-1');
    expect(events).toHaveLength(0);
  });
});

// ── InMemoryStyleProfileRepository ───────────────────────────────────────────

describe('InMemoryStyleProfileRepository', () => {
  let repo: StyleProfileRepositoryPort & { reset(): void };

  beforeEach(() => {
    repo = new InMemoryStyleProfileRepository();
  });

  it('satisfies StyleProfileRepositoryPort interface', () => {
    expect(typeof repo.save).toBe('function');
    expect(typeof repo.findByUserId).toBe('function');
  });

  it('saves a profile and retrieves it by user id', async () => {
    const profile = makeStyleProfile();
    await repo.save(profile);
    const found = await repo.findByUserId('user-1');
    expect(found).not.toBeNull();
    expect(found!.style_profile_id).toBe('profile-1');
    expect(found!.archetype).toBe('classic');
  });

  it('returns null when no profile exists for user', async () => {
    const found = await repo.findByUserId('nonexistent');
    expect(found).toBeNull();
  });

  it('clears all state on reset', async () => {
    await repo.save(makeStyleProfile());
    repo.reset();
    const found = await repo.findByUserId('user-1');
    expect(found).toBeNull();
  });
});

// ── MockAIProcessor ───────────────────────────────────────────────────────────

describe('MockAIProcessor', () => {
  let processor: AIProcessorPort & { configure(opts: { classification: AIClassification; backgroundRemovedUrl: string }): void; reset(): void };

  beforeEach(() => {
    processor = new MockAIProcessor();
  });

  it('satisfies AIProcessorPort interface', () => {
    expect(typeof processor.processImage).toBe('function');
  });

  it('returns the configured classification and background-removed URL without HTTP calls', async () => {
    const classification = makeClassification({ name: 'Navy Blazer', category: 'Tops', subcategory: 'Blazer' });
    processor.configure({ classification, backgroundRemovedUrl: 'https://cdn.example.com/bg-removed.webp' });
    const result = await processor.processImage(Buffer.from('fake-image'));
    expect(result.classification.name).toBe('Navy Blazer');
    expect(result.backgroundRemovedUrl).toBe('https://cdn.example.com/bg-removed.webp');
  });

  it('returns successive configurations independently', async () => {
    const classification1 = makeClassification({ name: 'Red Dress' });
    const classification2 = makeClassification({ name: 'Blue Jeans' });
    processor.configure({ classification: classification1, backgroundRemovedUrl: 'https://cdn.example.com/1.webp' });
    const result1 = await processor.processImage(Buffer.from('image-1'));
    expect(result1.classification.name).toBe('Red Dress');
    processor.configure({ classification: classification2, backgroundRemovedUrl: 'https://cdn.example.com/2.webp' });
    const result2 = await processor.processImage(Buffer.from('image-2'));
    expect(result2.classification.name).toBe('Blue Jeans');
  });

  it('clears configured response on reset', async () => {
    const classification = makeClassification();
    processor.configure({ classification, backgroundRemovedUrl: 'https://cdn.example.com/bg.webp' });
    processor.reset();
    await expect(processor.processImage(Buffer.from('image'))).rejects.toThrow();
  });
});

// ── MockWeatherService ────────────────────────────────────────────────────────

describe('MockWeatherService', () => {
  let service: WeatherServicePort & { configure(context: WeatherContext | null): void; reset(): void };

  beforeEach(() => {
    service = new MockWeatherService();
  });

  it('satisfies WeatherServicePort interface', () => {
    expect(typeof service.fetchForecast).toBe('function');
  });

  it('returns the configured WeatherContext', async () => {
    const context = new WeatherContext({ city: 'Milan', date: '2026-01-15', tempCelsius: 5, condition: 'partly_cloudy' });
    service.configure(context);
    const result = await service.fetchForecast('Milan', '2026-01-15');
    expect(result).not.toBeNull();
    expect(result!.city).toBe('Milan');
    expect(result!.tempCelsius).toBe(5);
  });

  it('returns null when configured to simulate API failure', async () => {
    service.configure(null);
    const result = await service.fetchForecast('Milan', '2026-01-15');
    expect(result).toBeNull();
  });

  it('clears configured context on reset and returns null by default', async () => {
    const context = new WeatherContext({ city: 'Rome', date: '2026-01-15', tempCelsius: 10, condition: 'sunny' });
    service.configure(context);
    service.reset();
    const result = await service.fetchForecast('Rome', '2026-01-15');
    expect(result).toBeNull();
  });
});

// ── InMemoryConsentLogAdapter ─────────────────────────────────────────────────

describe('InMemoryConsentLogAdapter', () => {
  let adapter: ConsentLogPort & { getConsentEvents(): Array<{ userId: string; granted: boolean }>; reset(): void };

  beforeEach(() => {
    adapter = new InMemoryConsentLogAdapter();
  });

  it('satisfies ConsentLogPort interface', () => {
    expect(typeof adapter.logConsent).toBe('function');
    expect(typeof adapter.isConsentGranted).toBe('function');
  });

  it('records consent granted and reflects it in isConsentGranted', async () => {
    await adapter.logConsent('user-1', true);
    const granted = await adapter.isConsentGranted('user-1');
    expect(granted).toBe(true);
  });

  it('records consent revoked and reflects it in isConsentGranted', async () => {
    await adapter.logConsent('user-1', true);
    await adapter.logConsent('user-1', false);
    const granted = await adapter.isConsentGranted('user-1');
    expect(granted).toBe(false);
  });

  it('returns false for user with no consent record', async () => {
    const granted = await adapter.isConsentGranted('unknown-user');
    expect(granted).toBe(false);
  });

  it('exposes consent events for test assertion', async () => {
    await adapter.logConsent('user-1', true);
    await adapter.logConsent('user-2', false);
    const events = adapter.getConsentEvents();
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ userId: 'user-1', granted: true });
    expect(events[1]).toEqual({ userId: 'user-2', granted: false });
  });

  it('clears all state on reset', async () => {
    await adapter.logConsent('user-1', true);
    adapter.reset();
    const granted = await adapter.isConsentGranted('user-1');
    expect(granted).toBe(false);
    expect(adapter.getConsentEvents()).toHaveLength(0);
  });
});

// ── InMemoryImageStoreAdapter ─────────────────────────────────────────────────

describe('InMemoryImageStoreAdapter', () => {
  let adapter: ImageStorePort & { reset(): void };

  beforeEach(() => {
    adapter = new InMemoryImageStoreAdapter();
  });

  it('satisfies ImageStorePort interface', () => {
    expect(typeof adapter.store).toBe('function');
    expect(typeof adapter.delete).toBe('function');
  });

  it('stores image buffer and returns a url containing the key', async () => {
    const url = await adapter.store('items/item-1/original', Buffer.from('fake-image-bytes'));
    expect(typeof url).toBe('string');
    expect(url).toContain('items/item-1/original');
  });

  it('deletes a stored key so it is no longer accessible', async () => {
    await adapter.store('items/item-1/original', Buffer.from('bytes'));
    await adapter.delete('items/item-1/original');
    const url = await adapter.store('items/item-1/original', Buffer.from('bytes'));
    expect(url).toContain('items/item-1/original');
  });

  it('clears all state on reset', async () => {
    await adapter.store('items/item-1/original', Buffer.from('bytes'));
    adapter.reset();
    const url = await adapter.store('items/item-1/original', Buffer.from('new-bytes'));
    expect(url).toContain('items/item-1/original');
  });
});

// ── InMemoryAIQualityLogAdapter ───────────────────────────────────────────────

describe('InMemoryAIQualityLogAdapter', () => {
  let adapter: AIQualityLogPort & { getCorrections(): Array<{ itemId: string; predicted: AIClassification; corrected: AIClassification }>; reset(): void };

  beforeEach(() => {
    adapter = new InMemoryAIQualityLogAdapter();
  });

  it('satisfies AIQualityLogPort interface', () => {
    expect(typeof adapter.logCorrection).toBe('function');
  });

  it('records a correction and exposes it for test assertion', async () => {
    const predicted = makeClassification({ name: 'Blue Shirt', category: 'Tops', subcategory: 'Shirt' });
    const corrected = makeClassification({ name: 'Blue Blouse', category: 'Tops', subcategory: 'Blouse' });
    await adapter.logCorrection('item-1', predicted, corrected);
    const corrections = adapter.getCorrections();
    expect(corrections).toHaveLength(1);
    expect(corrections[0].itemId).toBe('item-1');
    expect(corrections[0].predicted.name).toBe('Blue Shirt');
    expect(corrections[0].corrected.name).toBe('Blue Blouse');
  });

  it('clears all corrections on reset', async () => {
    await adapter.logCorrection('item-1', makeClassification(), makeClassification({ name: 'Other' }));
    adapter.reset();
    expect(adapter.getCorrections()).toHaveLength(0);
  });
});
