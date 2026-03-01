/**
 * local-server.ts
 *
 * Thin Express HTTP server for local development.
 *
 * Wraps the domain use cases (via the DI container) and exposes them over
 * HTTP on the same routes that API Gateway uses in production. This lets the
 * mobile app (or curl / Postman) hit http://localhost:3000 during development
 * without any AWS infrastructure.
 *
 * Usage:
 *   LOCAL=true pnpm --filter @pocketwardrobe/functions dev
 *
 * The server reads PORT (default 3000) from the environment.
 * CORS is enabled for all origins to support local mobile dev (Expo Go /
 * the Metro bundler runs on a different port).
 *
 * Handler contract:
 *   Each use case handler is a plain async function that accepts a typed
 *   request body and returns a typed response. The server adapts the Express
 *   req/res to this interface without modifying the handler functions — the
 *   same functions are invoked by Lambda in production.
 */

import express, { Request, Response, NextFunction } from 'express';
import { createContainer } from './container.js';
import { Wardrobe } from '../../domain/src/entities/Wardrobe.js';

// ---------------------------------------------------------------------------
// Guard: only run in local mode
// ---------------------------------------------------------------------------

if (!process.env['LOCAL'] && process.env['NODE_ENV'] !== 'development') {
  console.error(
    '[local-server] This server is for local development only.\n' +
      'Set LOCAL=true or NODE_ENV=development to enable it.',
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Container profile selection:
//   TEST_PROFILE=true  → in-memory adapters (no Supabase/AWS needed)
//   default            → production profile (needs SUPABASE_URL etc.)
// ---------------------------------------------------------------------------

const profile = process.env['TEST_PROFILE'] === 'true' ? 'test' : 'production';
console.log(`[local-server] Using container profile: ${profile}`);
const container = createContainer(profile);

// ---------------------------------------------------------------------------
// Express application
// ---------------------------------------------------------------------------

const app = express();

app.use(express.json({ limit: '10mb' }));

// CORS — open for local dev; the production API Gateway handles CORS itself.
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

app.options('*', (_req: Request, res: Response) => {
  res.sendStatus(204);
});

// ---------------------------------------------------------------------------
// Health check + consent (test profile only)
// GET  /health            — liveness probe
// POST /consent/grant     — grant photo consent for a user (TEST_PROFILE only)
// ---------------------------------------------------------------------------

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Consent routes (test profile only — production uses Supabase ConsentLog)
// POST /consent/grant  — grant photo storage consent for a user
// ---------------------------------------------------------------------------

app.post('/consent/grant', async (req: Request, res: Response) => {
  if (!container.consentLog) {
    res.status(503).json({ error: 'Consent endpoint only available in test profile (TEST_PROFILE=true)' });
    return;
  }
  const { userId } = req.body as { userId: string };
  await container.consentLog.logConsent(userId, true);
  res.status(200).json({ granted: true, userId });
});

// ---------------------------------------------------------------------------
// Wardrobe routes (test profile only — production uses Supabase)
// POST /wardrobe  — create a wardrobe (seeds the in-memory store)
// ---------------------------------------------------------------------------

app.post('/wardrobe', async (req: Request, res: Response) => {
  if (!container.wardrobeRepo) {
    res.status(503).json({ error: 'Wardrobe endpoint only available in test profile (TEST_PROFILE=true)' });
    return;
  }
  const { userId, wardrobeId } = req.body as { userId: string; wardrobeId: string };
  const wardrobe = new Wardrobe({
    wardrobe_id: wardrobeId,
    user_id: userId,
    item_count: 0,
    first_unlock_achieved: false,
    created_at: new Date(),
    updated_at: new Date(),
  });
  await container.wardrobeRepo.save(wardrobe);
  res.status(201).json({ wardrobe_id: wardrobeId, user_id: userId, item_count: 0 });
});

// ---------------------------------------------------------------------------
// Style Calibration routes
// POST /style-profile/calibrate  — CompleteCalibration
// POST /style-profile/skip       — SkipCalibration
// ---------------------------------------------------------------------------

app.post('/style-profile/calibrate', async (req: Request, res: Response) => {
  try {
    const { userId, archetype, occasions, palette } = req.body as {
      userId: string;
      archetype: string;
      occasions: string[];
      palette: string; // 'neutral' | 'vibrant' | 'monochrome' | 'earthy'
    };

    const styleProfile = await container.calibrateStyleUseCase.completeCalibration(
      userId,
      archetype as Parameters<typeof container.calibrateStyleUseCase.completeCalibration>[1],
      occasions,
      palette as Parameters<typeof container.calibrateStyleUseCase.completeCalibration>[3],
    );

    res.status(201).json(styleProfile);
  } catch (err) {
    handleError(res, err);
  }
});

app.post('/style-profile/skip', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body as { userId: string };

    const styleProfile = await container.calibrateStyleUseCase.skipCalibration(userId);

    res.status(201).json(styleProfile);
  } catch (err) {
    handleError(res, err);
  }
});

// ---------------------------------------------------------------------------
// Item Digitization routes
// POST /items/digitize     — InitiateDigitization
// POST /items/confirm      — ConfirmItem
// POST /items/correct      — CorrectMetadata
// DELETE /items/:itemId    — DeleteItem
// ---------------------------------------------------------------------------

app.post('/items/digitize', async (req: Request, res: Response) => {
  try {
    // Accept base64-encoded image so the mobile client doesn't need multipart/form-data.
    // The use case expects a raw Buffer; we decode here at the HTTP boundary.
    const { userId, wardrobeId, photoBase64 } = req.body as {
      userId: string;
      wardrobeId: string;
      photoBase64: string; // base64-encoded image bytes
    };

    const imageBuffer = Buffer.from(photoBase64, 'base64');
    const item = await container.digitizeItemUseCase.initiateDigitization(
      userId,
      wardrobeId,
      imageBuffer,
    );

    res.status(202).json(item);
  } catch (err) {
    handleError(res, err);
  }
});

app.post('/items/confirm', async (req: Request, res: Response) => {
  try {
    const { userId, itemId } = req.body as {
      userId: string;
      itemId: string;
    };

    const item = await container.digitizeItemUseCase.confirmItem(userId, itemId);

    // Simulate the PostgreSQL DB trigger that increments wardrobe.item_count
    // when an item transitions to 'active'. In production this is a DB trigger;
    // in test profile we replicate the behaviour here.
    if (container.wardrobeRepo) {
      await container.wardrobeRepo.updateItemCount(item.wardrobe_id, 1);
    }

    res.status(201).json(item);
  } catch (err) {
    handleError(res, err);
  }
});

app.post('/items/correct', async (req: Request, res: Response) => {
  try {
    const { userId, itemId, category, subcategory } = req.body as {
      userId: string;
      itemId: string;
      category: string;
      subcategory: string;
    };

    const item = await container.digitizeItemUseCase.correctMetadata(
      userId,
      itemId,
      category,
      subcategory,
    );

    res.status(200).json(item);
  } catch (err) {
    handleError(res, err);
  }
});

app.delete('/items/:itemId', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { itemId } = req.params;

    await container.digitizeItemUseCase.deleteItem(userId, itemId);

    res.sendStatus(204);
  } catch (err) {
    handleError(res, err);
  }
});

// ---------------------------------------------------------------------------
// Outfit Suggestion routes
// GET  /outfits/daily            — GetDailyOutfit
// POST /outfits/accept           — AcceptOutfit
// POST /outfits/swap             — SwapItem
// ---------------------------------------------------------------------------

app.get('/outfits/daily', async (req: Request, res: Response) => {
  try {
    const userId = req.query['userId'] as string;
    const wardrobeId = req.query['wardrobeId'] as string;
    const occasion = (req.query['occasion'] as string) ?? 'casual';
    const date = (req.query['date'] as string) ?? new Date().toISOString().slice(0, 10);

    const outfit = await container.suggestOutfitUseCase.getDailyOutfit(
      userId,
      wardrobeId,
      occasion,
      date,
    );

    res.status(200).json(outfit);
  } catch (err) {
    handleError(res, err);
  }
});

app.post('/outfits/accept', async (req: Request, res: Response) => {
  try {
    const { userId, outfitId, finalItemIds } = req.body as {
      userId: string;
      outfitId: string;
      finalItemIds: string[];
    };

    const wearEvent = await container.suggestOutfitUseCase.acceptOutfit(
      userId,
      outfitId,
      finalItemIds,
    );

    res.status(201).json(wearEvent);
  } catch (err) {
    handleError(res, err);
  }
});

// POST /outfits/swap — Item swap (deferred feature; seam defined, not yet implemented)
app.post('/outfits/swap', (_req: Request, res: Response) => {
  res.status(501).json({ error: 'Item swap not yet implemented (deferred to post-MVP)' });
});

// ---------------------------------------------------------------------------
// Error handler
// ---------------------------------------------------------------------------

function handleError(res: Response, err: unknown): void {
  if (err instanceof Error) {
    const status = (err as Error & { statusCode?: number }).statusCode ?? 500;
    res.status(status).json({ error: err.message });
  } else {
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Catch-all 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env['PORT'] ?? '3000', 10);

app.listen(PORT, () => {
  console.log(`[local-server] PocketWardrobe API running on http://localhost:${PORT}`);
  console.log(`[local-server] SUPABASE_URL: ${process.env['SUPABASE_URL'] ?? '(not set)'}`);
  console.log('[local-server] Press Ctrl+C to stop.');
});
