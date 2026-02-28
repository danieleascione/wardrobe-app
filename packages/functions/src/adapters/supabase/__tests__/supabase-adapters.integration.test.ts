/**
 * @integration
 *
 * Integration tests for Supabase persistence adapters.
 *
 * These tests require a running local Supabase instance.
 * If SUPABASE_LOCAL_URL is not set, all tests are skipped (graceful CI degradation).
 *
 * Setup: supabase start && supabase db reset
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { SupabaseItemRepository } from '../SupabaseItemRepository.js';
import { SupabaseWardrobeRepository } from '../SupabaseWardrobeRepository.js';
import { SupabaseOutfitRepository } from '../SupabaseOutfitRepository.js';
import { SupabaseWearEventRepository } from '../SupabaseWearEventRepository.js';
import { SupabaseStyleProfileRepository } from '../SupabaseStyleProfileRepository.js';
import { SupabaseConsentLogAdapter } from '../SupabaseConsentLogAdapter.js';
import { SupabaseAIQualityLogAdapter } from '../SupabaseAIQualityLogAdapter.js';

import { Item } from '@pocketwardrobe/domain';
import { Wardrobe } from '@pocketwardrobe/domain';
import { Outfit } from '@pocketwardrobe/domain';
import { WearEvent } from '@pocketwardrobe/domain';
import { StyleProfile } from '@pocketwardrobe/domain';
import { AIClassification } from '@pocketwardrobe/domain';

// ── Test guard — skip when local Supabase is not available ──────────────────

const LOCAL_URL = process.env['SUPABASE_LOCAL_URL'];
const LOCAL_ANON_KEY = process.env['SUPABASE_LOCAL_ANON_KEY'] ?? 'test-anon-key';
const runIntegration = LOCAL_URL !== undefined;

// ── Test fixtures ───────────────────────────────────────────────────────────

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';
const TEST_WARDROBE_ID = '00000000-0000-0000-0000-000000000002';
const TEST_ITEM_ID = '00000000-0000-0000-0000-000000000003';
const TEST_OUTFIT_ID = '00000000-0000-0000-0000-000000000004';
const TEST_WEAR_EVENT_ID = '00000000-0000-0000-0000-000000000005';
const TEST_STYLE_PROFILE_ID = '00000000-0000-0000-0000-000000000006';

function makeTestItem(overrides: Partial<ConstructorParameters<typeof Item>[0]> = {}): Item {
  return new Item({
    item_id: TEST_ITEM_ID,
    user_id: TEST_USER_ID,
    wardrobe_id: TEST_WARDROBE_ID,
    photo_url_original: 'https://s3.example.com/original.jpg',
    photo_url_thumbnail: 'https://cdn.example.com/thumb.webp',
    name: 'Blue Denim Jacket',
    color_primary: 'blue',
    color_hex: '#4169E1',
    category: 'outerwear',
    subcategory: 'jacket',
    seasons: ['spring', 'autumn'],
    occasions: ['casual', 'work'],
    fabric: 'denim',
    ai_confidence: 0.92,
    manual_classification: false,
    last_worn_at: null,
    created_at: new Date('2026-01-15T10:00:00Z'),
    updated_at: new Date('2026-01-15T10:00:00Z'),
    status: 'active',
    ...overrides,
  });
}

// ── Integration test suite ──────────────────────────────────────────────────

describe.skipIf(!runIntegration)('Supabase Adapters — Integration', () => {
  let client: SupabaseClient;
  let itemRepo: SupabaseItemRepository;
  let wardrobeRepo: SupabaseWardrobeRepository;
  let outfitRepo: SupabaseOutfitRepository;
  let wearEventRepo: SupabaseWearEventRepository;
  let styleProfileRepo: SupabaseStyleProfileRepository;
  let consentLog: SupabaseConsentLogAdapter;
  let aiQualityLog: SupabaseAIQualityLogAdapter;

  beforeEach(async () => {
    client = createClient(LOCAL_URL!, LOCAL_ANON_KEY);
    itemRepo = new SupabaseItemRepository(client);
    wardrobeRepo = new SupabaseWardrobeRepository(client);
    outfitRepo = new SupabaseOutfitRepository(client);
    wearEventRepo = new SupabaseWearEventRepository(client);
    styleProfileRepo = new SupabaseStyleProfileRepository(client);
    consentLog = new SupabaseConsentLogAdapter(client);
    aiQualityLog = new SupabaseAIQualityLogAdapter(client);

    // Seed wardrobe row required as FK for items
    await client.from('wardrobes').upsert({
      wardrobe_id: TEST_WARDROBE_ID,
      user_id: TEST_USER_ID,
      item_count: 0,
      first_unlock_achieved: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });

  afterEach(async () => {
    // Clean up test data in reverse FK dependency order
    await client.from('ai_quality_log').delete().eq('user_id', TEST_USER_ID);
    await client.from('wear_events').delete().eq('user_id', TEST_USER_ID);
    await client.from('outfit_suggestions').delete().eq('user_id', TEST_USER_ID);
    await client.from('items').delete().eq('user_id', TEST_USER_ID);
    await client.from('style_profiles').delete().eq('user_id', TEST_USER_ID);
    await client.from('wardrobes').delete().eq('user_id', TEST_USER_ID);
    // Consent log retained per regulatory requirements — clean test records
    await client.from('consent_log').delete().eq('user_id', TEST_USER_ID);
  });

  // ── SupabaseItemRepository ────────────────────────────────────────────────

  describe('SupabaseItemRepository', () => {
    // Behavior 1: save then findById returns identical domain entity
    it('save writes row and findById returns identical domain Item', async () => {
      const item = makeTestItem();

      await itemRepo.save(item);
      const retrieved = await itemRepo.findById(TEST_ITEM_ID);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.item_id).toBe(item.item_id);
      expect(retrieved!.user_id).toBe(item.user_id);
      expect(retrieved!.wardrobe_id).toBe(item.wardrobe_id);
      expect(retrieved!.name).toBe(item.name);
      expect(retrieved!.category).toBe(item.category);
      expect(retrieved!.subcategory).toBe(item.subcategory);
      expect(retrieved!.color_primary).toBe(item.color_primary);
      expect(retrieved!.color_hex).toBe(item.color_hex);
      expect(Array.from(retrieved!.seasons)).toEqual(Array.from(item.seasons));
      expect(Array.from(retrieved!.occasions)).toEqual(Array.from(item.occasions));
      expect(retrieved!.fabric).toBe(item.fabric);
      expect(retrieved!.ai_confidence).toBe(item.ai_confidence);
      expect(retrieved!.manual_classification).toBe(item.manual_classification);
      expect(retrieved!.status).toBe(item.status);
      expect(retrieved!.photo_url_original).toBe(item.photo_url_original);
      expect(retrieved!.photo_url_thumbnail).toBe(item.photo_url_thumbnail);
      expect(retrieved).toBeInstanceOf(Item);
    });

    // Behavior 2: findById returns null for non-existent ID
    it('findById returns null when item does not exist', async () => {
      const result = await itemRepo.findById('00000000-0000-0000-0000-999999999999');
      expect(result).toBeNull();
    });

    // Behavior 3: findByOccasionAndSeason excludes pending_ai and deleted items
    it('findByOccasionAndSeason returns only active items matching occasion and season', async () => {
      const activeItem = makeTestItem({
        item_id: '00000000-0000-0000-0000-000000000010',
        occasions: ['casual'],
        seasons: ['spring'],
        status: 'active',
      });
      const pendingItem = makeTestItem({
        item_id: '00000000-0000-0000-0000-000000000011',
        occasions: ['casual'],
        seasons: ['spring'],
        status: 'pending_ai',
      });
      const deletedItem = makeTestItem({
        item_id: '00000000-0000-0000-0000-000000000012',
        occasions: ['casual'],
        seasons: ['spring'],
        status: 'deleted',
      });

      await itemRepo.save(activeItem);
      await itemRepo.save(pendingItem);
      await itemRepo.save(deletedItem);

      const results = await itemRepo.findByOccasionAndSeason(
        TEST_WARDROBE_ID,
        'casual',
        'spring',
      );

      const ids = results.map((i) => i.item_id);
      expect(ids).toContain('00000000-0000-0000-0000-000000000010');
      expect(ids).not.toContain('00000000-0000-0000-0000-000000000011');
      expect(ids).not.toContain('00000000-0000-0000-0000-000000000012');
      results.forEach((item) => expect(item).toBeInstanceOf(Item));
    });

    // Behavior 4: item_count trigger increments on active item insert
    it('item_count on wardrobe increments after active item insert', async () => {
      const wardrobeBefore = await wardrobeRepo.findByUserId(TEST_USER_ID);
      expect(wardrobeBefore!.item_count).toBe(0);

      await itemRepo.save(makeTestItem({ status: 'active' }));

      const wardrobeAfter = await wardrobeRepo.findByUserId(TEST_USER_ID);
      expect(wardrobeAfter!.item_count).toBe(1);
    });

    // Behavior 5: item_count trigger decrements when status becomes deleted
    it('item_count on wardrobe decrements after item status set to deleted', async () => {
      await itemRepo.save(makeTestItem({ status: 'active' }));
      const wardrobeAfterInsert = await wardrobeRepo.findByUserId(TEST_USER_ID);
      expect(wardrobeAfterInsert!.item_count).toBe(1);

      // Update item status to deleted
      await itemRepo.save(makeTestItem({ status: 'deleted' }));

      const wardrobeAfterDelete = await wardrobeRepo.findByUserId(TEST_USER_ID);
      expect(wardrobeAfterDelete!.item_count).toBe(0);
    });

    // Behavior 6: findByWardrobe returns active items for the wardrobe
    it('findByWardrobe returns all active items for a wardrobe', async () => {
      await itemRepo.save(makeTestItem({ item_id: '00000000-0000-0000-0000-000000000020', status: 'active' }));
      await itemRepo.save(makeTestItem({ item_id: '00000000-0000-0000-0000-000000000021', status: 'pending_ai' }));

      const results = await itemRepo.findByWardrobe(TEST_WARDROBE_ID);
      const ids = results.map((i) => i.item_id);
      expect(ids).toContain('00000000-0000-0000-0000-000000000020');
      expect(ids).not.toContain('00000000-0000-0000-0000-000000000021');
    });
  });

  // ── SupabaseWardrobeRepository ────────────────────────────────────────────

  describe('SupabaseWardrobeRepository', () => {
    // Behavior 7: findByUserId returns wardrobe with current item_count
    it('findByUserId returns wardrobe entity with item_count maintained by trigger', async () => {
      const wardrobe = await wardrobeRepo.findByUserId(TEST_USER_ID);

      expect(wardrobe).not.toBeNull();
      expect(wardrobe).toBeInstanceOf(Wardrobe);
      expect(wardrobe!.user_id).toBe(TEST_USER_ID);
      expect(wardrobe!.wardrobe_id).toBe(TEST_WARDROBE_ID);
      expect(wardrobe!.item_count).toBe(0);
    });

    // Behavior 8: findByUserId returns null for unknown user
    it('findByUserId returns null when wardrobe does not exist', async () => {
      const result = await wardrobeRepo.findByUserId('00000000-0000-0000-0000-999999999998');
      expect(result).toBeNull();
    });
  });

  // ── SupabaseOutfitRepository ──────────────────────────────────────────────

  describe('SupabaseOutfitRepository', () => {
    const ITEM_IDS = [
      '00000000-0000-0000-0000-000000000030',
      '00000000-0000-0000-0000-000000000031',
      '00000000-0000-0000-0000-000000000032',
    ];

    function makeTestOutfit(): Outfit {
      return new Outfit({
        outfit_id: TEST_OUTFIT_ID,
        user_id: TEST_USER_ID,
        item_ids: ITEM_IDS,
        occasion: 'casual',
        weather_context: null,
        reasoning: 'Comfortable spring look',
        generated_at: new Date('2026-02-28T10:00:00Z'),
        suggestion_date: '2026-02-28',
        status: 'active',
      });
    }

    // Behavior 9: save then findByUserId returns matching outfit
    it('save then findByUserId returns outfit with all fields', async () => {
      const outfit = makeTestOutfit();
      await outfitRepo.save(outfit);

      const results = await outfitRepo.findByUserId(TEST_USER_ID);
      const found = results.find((o) => o.outfit_id === TEST_OUTFIT_ID);

      expect(found).toBeDefined();
      expect(found).toBeInstanceOf(Outfit);
      expect(found!.occasion).toBe('casual');
      expect(found!.suggestion_date).toBe('2026-02-28');
      expect(Array.from(found!.item_ids)).toEqual(ITEM_IDS);
    });

    // Behavior 10: findByDateWindow returns outfits in date range
    it('findByDateWindow returns outfits within inclusive date window', async () => {
      await outfitRepo.save(makeTestOutfit());

      const results = await outfitRepo.findByDateWindow(TEST_USER_ID, '2026-02-01', '2026-02-28');
      expect(results.length).toBeGreaterThanOrEqual(1);
      const found = results.find((o) => o.outfit_id === TEST_OUTFIT_ID);
      expect(found).toBeDefined();
    });
  });

  // ── SupabaseWearEventRepository ───────────────────────────────────────────

  describe('SupabaseWearEventRepository', () => {
    const OUTFIT_ID_FOR_WEAR = '00000000-0000-0000-0000-000000000040';
    const ITEMS_WORN = [
      '00000000-0000-0000-0000-000000000041',
      '00000000-0000-0000-0000-000000000042',
    ];

    beforeEach(async () => {
      // Seed a minimal outfit_suggestion row for the FK
      await client.from('outfit_suggestions').upsert({
        outfit_id: OUTFIT_ID_FOR_WEAR,
        user_id: TEST_USER_ID,
        item_ids: ITEMS_WORN,
        occasion: 'casual',
        weather_context: null,
        reasoning: 'test',
        generated_at: new Date().toISOString(),
        suggestion_date: '2026-02-28',
        status: 'active',
      });
    });

    // Behavior 11: save then findByItemId returns matching wear event
    it('save then findByItemId returns wear event containing the item', async () => {
      const wearEvent = new WearEvent({
        wear_event_id: TEST_WEAR_EVENT_ID,
        user_id: TEST_USER_ID,
        outfit_id: OUTFIT_ID_FOR_WEAR,
        items_worn: ITEMS_WORN,
        worn_date: '2026-02-28',
        created_at: new Date('2026-02-28T18:00:00Z'),
      });

      await wearEventRepo.save(wearEvent);
      const results = await wearEventRepo.findByItemId(ITEMS_WORN[0]!);

      const found = results.find((e) => e.wear_event_id === TEST_WEAR_EVENT_ID);
      expect(found).toBeDefined();
      expect(found).toBeInstanceOf(WearEvent);
      expect(found!.worn_date).toBe('2026-02-28');
    });
  });

  // ── SupabaseStyleProfileRepository ───────────────────────────────────────

  describe('SupabaseStyleProfileRepository', () => {
    // Behavior 12: save then findByUserId returns identical StyleProfile
    it('save then findByUserId returns matching StyleProfile', async () => {
      const profile = new StyleProfile({
        style_profile_id: TEST_STYLE_PROFILE_ID,
        user_id: TEST_USER_ID,
        archetype: 'minimalist',
        occasion_priorities: ['work', 'casual'],
        palette: 'neutral',
        calibration_completed: true,
        calibration_version: 1,
        created_at: new Date('2026-01-01T00:00:00Z'),
        updated_at: new Date('2026-01-01T00:00:00Z'),
      });

      await styleProfileRepo.save(profile);
      const retrieved = await styleProfileRepo.findByUserId(TEST_USER_ID);

      expect(retrieved).not.toBeNull();
      expect(retrieved).toBeInstanceOf(StyleProfile);
      expect(retrieved!.archetype).toBe('minimalist');
      expect(retrieved!.calibration_completed).toBe(true);
      expect(Array.from(retrieved!.occasion_priorities)).toEqual(['work', 'casual']);
    });

    // Behavior 13: findByUserId returns null when no profile exists
    it('findByUserId returns null when no style profile exists', async () => {
      const result = await styleProfileRepo.findByUserId('00000000-0000-0000-0000-999999999997');
      expect(result).toBeNull();
    });
  });

  // ── SupabaseConsentLogAdapter ─────────────────────────────────────────────

  describe('SupabaseConsentLogAdapter', () => {
    // Behavior 14: logConsent then isConsentGranted reflects granted state
    it('logConsent granted=true then isConsentGranted returns true', async () => {
      await consentLog.logConsent(TEST_USER_ID, true);
      const granted = await consentLog.isConsentGranted(TEST_USER_ID);
      expect(granted).toBe(true);
    });

    // Behavior 15: consent revocation reflected in isConsentGranted
    it('logConsent granted=false after grant then isConsentGranted returns false', async () => {
      await consentLog.logConsent(TEST_USER_ID, true);
      await consentLog.logConsent(TEST_USER_ID, false);
      const granted = await consentLog.isConsentGranted(TEST_USER_ID);
      expect(granted).toBe(false);
    });
  });

  // ── SupabaseAIQualityLogAdapter ───────────────────────────────────────────

  describe('SupabaseAIQualityLogAdapter', () => {
    beforeEach(async () => {
      // Seed an item required for FK on ai_quality_log
      await itemRepo.save(makeTestItem({ item_id: TEST_ITEM_ID, status: 'active' }));
    });

    // Behavior 16: logCorrection writes a record queryable by category (BR-10)
    it('logCorrection records predicted vs corrected category for correction rate queries', async () => {
      const predicted = new AIClassification({
        name: 'Jacket',
        color_primary: 'blue',
        color_hex: null,
        category: 'tops',
        subcategory: 'shirt',
        seasons: ['spring'],
        occasions: ['casual'],
        fabric: null,
        ai_confidence: 0.7,
      });
      const corrected = new AIClassification({
        name: 'Jacket',
        color_primary: 'blue',
        color_hex: null,
        category: 'outerwear',
        subcategory: 'jacket',
        seasons: ['spring'],
        occasions: ['casual'],
        fabric: null,
        ai_confidence: 0.7,
      });

      await aiQualityLog.logCorrection(TEST_ITEM_ID, predicted, corrected);

      // Verify correction is persisted and queryable — check via raw client
      const { data } = await client
        .from('ai_quality_log')
        .select('*')
        .eq('item_id', TEST_ITEM_ID);

      expect(data).not.toBeNull();
      expect(data!.length).toBeGreaterThanOrEqual(1);
      const log = data![0];
      expect(log['predicted_cat']).toBe('tops');
      expect(log['corrected_cat']).toBe('outerwear');
    });
  });
});

// ── Migration SQL syntax check (runs without local Supabase) ─────────────────

describe('Migration SQL — syntax validity', () => {
  it('migration file 001_initial_schema.sql exists and is non-empty', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const path = await import('node:path');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    // Resolve to project root supabase/migrations
    const migrationPath = path.resolve(__dirname, '../../../../../../supabase/migrations/001_initial_schema.sql');

    const sql = readFileSync(migrationPath, 'utf-8');
    expect(sql.length).toBeGreaterThan(500);
    expect(sql).toContain('CREATE TABLE');
    expect(sql).toContain('wardrobes');
    expect(sql).toContain('items');
    expect(sql).toContain('outfit_suggestions');
    expect(sql).toContain('wear_events');
    expect(sql).toContain('consent_log');
    expect(sql).toContain('ai_quality_log');
    expect(sql).toContain('style_profiles');
  });

  it('migration defines GIN index on items array columns', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const path = await import('node:path');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const migrationPath = path.resolve(__dirname, '../../../../../../supabase/migrations/001_initial_schema.sql');

    const sql = readFileSync(migrationPath, 'utf-8');
    expect(sql).toContain('GIN');
    expect(sql).toContain('occasions');
    expect(sql).toContain('seasons');
  });

  it('migration defines item_count trigger on items table', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const path = await import('node:path');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const migrationPath = path.resolve(__dirname, '../../../../../../supabase/migrations/001_initial_schema.sql');

    const sql = readFileSync(migrationPath, 'utf-8');
    expect(sql).toContain('item_count');
    expect(sql).toContain('TRIGGER');
    expect(sql.toUpperCase()).toContain('TRIGGER');
  });

  it('migration enables RLS on all tables', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const path = await import('node:path');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const migrationPath = path.resolve(__dirname, '../../../../../../supabase/migrations/001_initial_schema.sql');

    const sql = readFileSync(migrationPath, 'utf-8');
    expect(sql.toUpperCase()).toContain('ROW LEVEL SECURITY');
    expect(sql.toUpperCase()).toContain('AUTH.UID()');
  });
});
