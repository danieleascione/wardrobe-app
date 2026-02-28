import { describe, it, expect } from 'vitest';
import { Item, ItemStatus } from '../Item.js';
import { Wardrobe } from '../Wardrobe.js';
import { StyleProfile } from '../StyleProfile.js';
import { Outfit } from '../Outfit.js';
import { WearEvent } from '../WearEvent.js';
import {
  Color,
  Category,
  Season,
  Occasion,
  WeatherContext,
  AIClassification,
  WardrobeStats,
} from '../../value-objects/index.js';

// ── Test Budget: 7 distinct behaviors × 2 = 14 max unit tests ─────────────

const makeItem = (overrides: Partial<ConstructorParameters<typeof Item>[0]> = {}): Item => {
  return new Item({
    item_id: 'item-uuid-1',
    user_id: 'user-uuid-1',
    wardrobe_id: 'wardrobe-uuid-1',
    photo_url_original: 's3://pocket-wardrobe-prod/user-uuid-1/item-uuid-1/original.jpg',
    photo_url_thumbnail: 'https://cdn.pocketwardrobe.com/user-uuid-1/item-uuid-1/thumb.webp',
    name: 'Camel Coat',
    color_primary: 'Camel / Warm tan',
    color_hex: '#C19A6B',
    category: 'Outerwear',
    subcategory: 'Coat',
    seasons: ['spring', 'autumn', 'winter'],
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
};

// ── AC1: Item entity fields and status lifecycle ───────────────────────────

describe('Item entity', () => {
  it('holds all fields from the data model schema', () => {
    const item = makeItem();

    expect(item.item_id).toBe('item-uuid-1');
    expect(item.user_id).toBe('user-uuid-1');
    expect(item.wardrobe_id).toBe('wardrobe-uuid-1');
    expect(item.photo_url_original).toBe('s3://pocket-wardrobe-prod/user-uuid-1/item-uuid-1/original.jpg');
    expect(item.photo_url_thumbnail).toBe('https://cdn.pocketwardrobe.com/user-uuid-1/item-uuid-1/thumb.webp');
    expect(item.name).toBe('Camel Coat');
    expect(item.color_primary).toBe('Camel / Warm tan');
    expect(item.color_hex).toBe('#C19A6B');
    expect(item.category).toBe('Outerwear');
    expect(item.subcategory).toBe('Coat');
    expect(item.seasons).toEqual(['spring', 'autumn', 'winter']);
    expect(item.occasions).toEqual(['work', 'casual']);
    expect(item.fabric).toBe('wool');
    expect(item.ai_confidence).toBe(0.92);
    expect(item.manual_classification).toBe(false);
    expect(item.last_worn_at).toBeNull();
    expect(item.status).toBe('active');
  });

  it.each([
    ['active' as ItemStatus],
    ['pending_ai' as ItemStatus],
    ['pending_review' as ItemStatus],
    ['deleted' as ItemStatus],
  ])('accepts status: %s', (status) => {
    const item = makeItem({ status });
    expect(item.status).toBe(status);
  });
});

// ── AC2: BR-01 — outfit suggestion requires wardrobe.item_count >= 5 ───────

describe('Wardrobe entity', () => {
  it('returns null for outfit suggestion when item_count is below 5', () => {
    const wardrobe = new Wardrobe({
      wardrobe_id: 'wardrobe-uuid-1',
      user_id: 'user-uuid-1',
      item_count: 4,
      first_unlock_achieved: false,
      created_at: new Date('2026-01-01T00:00:00Z'),
      updated_at: new Date('2026-01-01T00:00:00Z'),
    });

    expect(wardrobe.canSuggestOutfit()).toBe(false);
  });

  it('allows outfit suggestion when item_count is at least 5', () => {
    const wardrobe = new Wardrobe({
      wardrobe_id: 'wardrobe-uuid-1',
      user_id: 'user-uuid-1',
      item_count: 5,
      first_unlock_achieved: false,
      created_at: new Date('2026-01-01T00:00:00Z'),
      updated_at: new Date('2026-01-01T00:00:00Z'),
    });

    expect(wardrobe.canSuggestOutfit()).toBe(true);
  });
});

// ── AC3: Outfit item composition is immutable after construction ────────────

describe('Outfit entity', () => {
  it('raises an error when fewer than 3 items are provided (BR-03)', () => {
    expect(() =>
      new Outfit({
        outfit_id: 'outfit-uuid-1',
        user_id: 'user-uuid-1',
        item_ids: ['item-1', 'item-2'],
        occasion: 'work',
        weather_context: null,
        reasoning: 'Test outfit',
        generated_at: new Date('2026-01-15T08:00:00Z'),
        suggestion_date: '2026-01-15',
        status: 'active',
      })
    ).toThrow('Outfit must contain at least 3 items');
  });

  it('prevents mutation of item_ids after construction', () => {
    const outfit = new Outfit({
      outfit_id: 'outfit-uuid-1',
      user_id: 'user-uuid-1',
      item_ids: ['item-1', 'item-2', 'item-3'],
      occasion: 'work',
      weather_context: null,
      reasoning: 'Test outfit',
      generated_at: new Date('2026-01-15T08:00:00Z'),
      suggestion_date: '2026-01-15',
      status: 'active',
    });

    expect(() => {
      (outfit.item_ids as string[]).push('item-4');
    }).toThrow();
  });
});

// ── AC4: WearEvent requires explicit outfit reference and final items ────────

describe('WearEvent entity', () => {
  it('creates successfully with explicit outfit reference and items list', () => {
    const event = new WearEvent({
      wear_event_id: 'event-uuid-1',
      user_id: 'user-uuid-1',
      outfit_id: 'outfit-uuid-1',
      items_worn: ['item-1', 'item-2', 'item-3'],
      worn_date: '2026-01-15',
      created_at: new Date('2026-01-15T09:00:00Z'),
    });

    expect(event.outfit_id).toBe('outfit-uuid-1');
    expect(event.items_worn).toEqual(['item-1', 'item-2', 'item-3']);
  });

  it('raises an error when items_worn list is empty (BR-05)', () => {
    expect(() =>
      new WearEvent({
        wear_event_id: 'event-uuid-1',
        user_id: 'user-uuid-1',
        outfit_id: 'outfit-uuid-1',
        items_worn: [],
        worn_date: '2026-01-15',
        created_at: new Date('2026-01-15T09:00:00Z'),
      })
    ).toThrow('WearEvent requires at least one item worn');
  });
});

// ── AC5: BR-09 — StyleProfile defaults on calibration skip ─────────────────

describe('StyleProfile entity', () => {
  it('returns classic archetype, work+casual occasions, and neutral palette when calibration is not completed', () => {
    const profile = new StyleProfile({
      style_profile_id: 'profile-uuid-1',
      user_id: 'user-uuid-1',
      archetype: 'classic',
      occasion_priorities: ['work', 'casual'],
      palette: 'neutral',
      calibration_completed: false,
      calibration_version: 0,
      created_at: new Date('2026-01-01T00:00:00Z'),
      updated_at: new Date('2026-01-01T00:00:00Z'),
    });

    const defaults = profile.effectivePreferences();
    expect(defaults.archetype).toBe('classic');
    expect(defaults.occasion_priorities).toEqual(['work', 'casual']);
    expect(defaults.palette).toBe('neutral');
  });

  it('returns stored preferences when calibration is completed', () => {
    const profile = new StyleProfile({
      style_profile_id: 'profile-uuid-1',
      user_id: 'user-uuid-1',
      archetype: 'bold',
      occasion_priorities: ['casual', 'sport'],
      palette: 'vibrant',
      calibration_completed: true,
      calibration_version: 1,
      created_at: new Date('2026-01-01T00:00:00Z'),
      updated_at: new Date('2026-01-01T00:00:00Z'),
    });

    const prefs = profile.effectivePreferences();
    expect(prefs.archetype).toBe('bold');
    expect(prefs.occasion_priorities).toEqual(['casual', 'sport']);
    expect(prefs.palette).toBe('vibrant');
  });
});

// ── AC6: Value objects are immutable and structurally equal ────────────────

describe('Value objects', () => {
  it('Color is immutable and has structural equality', () => {
    const color1 = new Color({ primary: 'Camel / Warm tan', hex: '#C19A6B' });
    const color2 = new Color({ primary: 'Camel / Warm tan', hex: '#C19A6B' });

    expect(color1.equals(color2)).toBe(true);
    expect(() => {
      (color1 as { primary: string }).primary = 'Navy Blue';
    }).toThrow();
  });

  it('Category is immutable and has structural equality', () => {
    const cat1 = new Category({ category: 'Outerwear', subcategory: 'Coat' });
    const cat2 = new Category({ category: 'Outerwear', subcategory: 'Coat' });
    const cat3 = new Category({ category: 'Tops', subcategory: 'T-Shirt' });

    expect(cat1.equals(cat2)).toBe(true);
    expect(cat1.equals(cat3)).toBe(false);
    expect(() => {
      (cat1 as { category: string }).category = 'Tops';
    }).toThrow();
  });

  it('Season is immutable and has structural equality', () => {
    const s1 = new Season({ values: ['spring', 'autumn'] });
    const s2 = new Season({ values: ['spring', 'autumn'] });

    expect(s1.equals(s2)).toBe(true);
    expect(() => {
      (s1.values as string[]).push('winter');
    }).toThrow();
  });

  it('WeatherContext is immutable and has structural equality', () => {
    const wc1 = new WeatherContext({ city: 'milan', date: '2026-01-15', tempCelsius: 5, condition: 'partly_cloudy' });
    const wc2 = new WeatherContext({ city: 'milan', date: '2026-01-15', tempCelsius: 5, condition: 'partly_cloudy' });

    expect(wc1.equals(wc2)).toBe(true);
    expect(() => {
      (wc1 as { city: string }).city = 'paris';
    }).toThrow();
  });

  it('WardrobeStats is derived and structurally equal', () => {
    const stats1 = new WardrobeStats({ total_items: 10, unworn_count: 3 });
    const stats2 = new WardrobeStats({ total_items: 10, unworn_count: 3 });

    expect(stats1.equals(stats2)).toBe(true);
    expect(stats1.total_items).toBe(10);
    expect(stats1.unworn_count).toBe(3);
  });
});
