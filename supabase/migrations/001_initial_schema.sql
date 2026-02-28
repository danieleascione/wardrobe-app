-- =============================================================================
-- PocketWardrobe — Initial Schema Migration
-- Version: 001
-- Database: PostgreSQL 16 via Supabase (EU region)
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================================
-- WARDROBES
-- One wardrobe per user (1:1). Auto-created on first user registration.
-- item_count maintained by DB trigger on items INSERT/DELETE — never updated
-- from application code.
-- =============================================================================

CREATE TABLE IF NOT EXISTS wardrobes (
  wardrobe_id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_count            INT           NOT NULL DEFAULT 0 CHECK (item_count >= 0),
  first_unlock_achieved BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT wardrobes_user_id_unique UNIQUE (user_id)
);

-- Index for FK lookups
CREATE INDEX IF NOT EXISTS idx_wardrobes_user_id ON wardrobes (user_id);

-- =============================================================================
-- ITEMS
-- Core wardrobe items with AI-extracted metadata.
-- =============================================================================

CREATE TABLE IF NOT EXISTS items (
  item_id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wardrobe_id           UUID          NOT NULL REFERENCES wardrobes(wardrobe_id) ON DELETE CASCADE,

  -- Photo URLs
  photo_url_original    TEXT          NOT NULL,
  photo_url_thumbnail   TEXT          NOT NULL,

  -- AI-extracted metadata
  name                  TEXT          NOT NULL,
  color_primary         TEXT          NOT NULL,
  color_hex             TEXT,
  category              TEXT          NOT NULL,
  subcategory           TEXT          NOT NULL,
  seasons               TEXT[]        NOT NULL DEFAULT '{}',
  occasions             TEXT[]        NOT NULL DEFAULT '{}',
  fabric                TEXT,

  -- Classification provenance
  ai_confidence         FLOAT,
  manual_classification BOOLEAN       NOT NULL DEFAULT FALSE,

  -- Wear tracking (derived at query time from wear_events)
  last_worn_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- Lifecycle
  status                TEXT          NOT NULL DEFAULT 'pending_ai'
                        CHECK (status IN ('active', 'pending_ai', 'pending_review', 'deleted'))
);

-- Wardrobe grid query: (user_id, status)
CREATE INDEX IF NOT EXISTS idx_items_user_status
  ON items (user_id, status);

-- Outfit engine filter: (user_id, occasions, seasons, status)
-- GIN index on array columns for efficient containment queries
CREATE INDEX IF NOT EXISTS idx_items_user_occasions_seasons_status
  ON items USING GIN (occasions, seasons)
  WHERE status = 'active';

-- Additional covering index for user_id + status filter alongside array search
CREATE INDEX IF NOT EXISTS idx_items_user_id_status_gin
  ON items (user_id, status);

-- Unworn items query: (user_id, last_worn_at)
CREATE INDEX IF NOT EXISTS idx_items_user_last_worn
  ON items (user_id, last_worn_at);

-- =============================================================================
-- ITEM_COUNT TRIGGER
-- Maintains wardrobes.item_count on active item INSERT/UPDATE/DELETE.
-- Fires AFTER INSERT when status = 'active' → increment.
-- Fires AFTER UPDATE when status transitions to 'deleted' → decrement.
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_update_wardrobe_item_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- New item inserted as active → increment
    IF NEW.status = 'active' THEN
      UPDATE wardrobes
        SET item_count = item_count + 1,
            updated_at = NOW()
        WHERE wardrobe_id = NEW.wardrobe_id;
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Transition from active to deleted → decrement
    IF OLD.status = 'active' AND NEW.status = 'deleted' THEN
      UPDATE wardrobes
        SET item_count = GREATEST(0, item_count - 1),
            updated_at = NOW()
        WHERE wardrobe_id = NEW.wardrobe_id;

    -- Transition from non-active to active → increment
    ELSIF OLD.status != 'active' AND NEW.status = 'active' THEN
      UPDATE wardrobes
        SET item_count = item_count + 1,
            updated_at = NOW()
        WHERE wardrobe_id = NEW.wardrobe_id;
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    -- Hard delete of an active item → decrement
    IF OLD.status = 'active' THEN
      UPDATE wardrobes
        SET item_count = GREATEST(0, item_count - 1),
            updated_at = NOW()
        WHERE wardrobe_id = OLD.wardrobe_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_items_update_item_count
AFTER INSERT OR UPDATE OR DELETE ON items
FOR EACH ROW
EXECUTE FUNCTION fn_update_wardrobe_item_count();

-- =============================================================================
-- STYLE_PROFILES
-- One style profile per user. Created on calibration completion or skip.
-- =============================================================================

CREATE TABLE IF NOT EXISTS style_profiles (
  style_profile_id      UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  archetype             TEXT          NOT NULL DEFAULT 'classic'
                        CHECK (archetype IN ('classic', 'minimalist', 'bold', 'sporty', 'romantic')),
  occasion_priorities   TEXT[]        NOT NULL DEFAULT '{"work","casual"}',
  palette               TEXT          NOT NULL DEFAULT 'neutral'
                        CHECK (palette IN ('neutral', 'vibrant', 'monochrome', 'earthy')),

  calibration_completed BOOLEAN       NOT NULL DEFAULT FALSE,
  calibration_version   INT           NOT NULL DEFAULT 0,

  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT style_profiles_user_id_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_style_profiles_user_id ON style_profiles (user_id);

-- =============================================================================
-- OUTFIT_SUGGESTIONS
-- Immutable after creation. Status may become 'invalidated' when a referenced
-- item is deleted (BR-08).
-- =============================================================================

CREATE TABLE IF NOT EXISTS outfit_suggestions (
  outfit_id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  item_ids              UUID[]        NOT NULL,
  occasion              TEXT          NOT NULL,
  weather_context       JSONB,
  reasoning             TEXT          NOT NULL DEFAULT '',

  generated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  suggestion_date       DATE          NOT NULL,

  status                TEXT          NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'invalidated'))
);

-- Daily outfit and rotation check: (user_id, suggestion_date DESC)
CREATE INDEX IF NOT EXISTS idx_outfit_suggestions_user_date
  ON outfit_suggestions (user_id, suggestion_date DESC);

-- Rotation constraint query — 7-day window
CREATE INDEX IF NOT EXISTS idx_outfit_suggestions_user_status_date
  ON outfit_suggestions (user_id, status, suggestion_date);

-- =============================================================================
-- WEAR_EVENTS
-- Created only on explicit user acceptance of an outfit suggestion (BR-05).
-- =============================================================================

CREATE TABLE IF NOT EXISTS wear_events (
  wear_event_id         UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outfit_id             UUID          NOT NULL REFERENCES outfit_suggestions(outfit_id) ON DELETE RESTRICT,

  items_worn            UUID[]        NOT NULL,
  worn_date             DATE          NOT NULL,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wear_events_user_id ON wear_events (user_id);
CREATE INDEX IF NOT EXISTS idx_wear_events_outfit_id ON wear_events (outfit_id);

-- =============================================================================
-- CONSENT_LOG
-- GDPR Article 17: NOT deleted on user account delete (regulatory hold — 3yr).
-- user_id is nullable to support anonymisation on account deletion.
-- =============================================================================

CREATE TABLE IF NOT EXISTS consent_log (
  consent_id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  consent_type          TEXT          NOT NULL
                        CHECK (consent_type IN ('photo_storage', 'body_data')),
  consent_version       TEXT          NOT NULL DEFAULT 'v1.0',
  granted               BOOLEAN       NOT NULL,
  granted_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  revoked_at            TIMESTAMPTZ,
  ip_country            TEXT
);

CREATE INDEX IF NOT EXISTS idx_consent_log_user_id ON consent_log (user_id);

-- =============================================================================
-- AI_QUALITY_LOG
-- Logs AI classification corrections for model improvement (BR-10).
-- Anonymised (not deleted) on account deletion — user_id set to null.
-- item_id set to null on item deletion.
-- =============================================================================

CREATE TABLE IF NOT EXISTS ai_quality_log (
  log_id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  item_id               UUID          REFERENCES items(item_id) ON DELETE SET NULL,

  predicted_cat         TEXT          NOT NULL,
  corrected_cat         TEXT,
  predicted_subcat      TEXT,
  corrected_subcat      TEXT,
  ai_confidence         FLOAT         NOT NULL,
  logged_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_quality_log_item_id ON ai_quality_log (item_id);
CREATE INDEX IF NOT EXISTS idx_ai_quality_log_user_id ON ai_quality_log (user_id);
-- Correction rate queries per category (BR-10)
CREATE INDEX IF NOT EXISTS idx_ai_quality_log_predicted_cat ON ai_quality_log (predicted_cat);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Users can only access their own rows via auth.uid().
-- =============================================================================

ALTER TABLE wardrobes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfit_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wear_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_quality_log   ENABLE ROW LEVEL SECURITY;

-- Wardrobes: user owns their wardrobe
CREATE POLICY "wardrobes_own_rows" ON wardrobes
  FOR ALL USING (user_id = auth.uid());

-- Items: user owns their items
CREATE POLICY "items_own_rows" ON items
  FOR ALL USING (user_id = auth.uid());

-- Style profiles: user owns their profile
CREATE POLICY "style_profiles_own_rows" ON style_profiles
  FOR ALL USING (user_id = auth.uid());

-- Outfit suggestions: user owns their suggestions
CREATE POLICY "outfit_suggestions_own_rows" ON outfit_suggestions
  FOR ALL USING (user_id = auth.uid());

-- Wear events: user owns their wear events
CREATE POLICY "wear_events_own_rows" ON wear_events
  FOR ALL USING (user_id = auth.uid());

-- Consent log: user can read/insert their own rows; no delete allowed
CREATE POLICY "consent_log_own_rows" ON consent_log
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "consent_log_insert_own" ON consent_log
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- AI quality log: user can read/insert their own rows
CREATE POLICY "ai_quality_log_own_rows" ON ai_quality_log
  FOR ALL USING (user_id = auth.uid());
