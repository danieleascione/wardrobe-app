import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { NanaBananaAdapter } from '../NanaBananaAdapter.js';
import { AIClassification } from '@pocketwardrobe/domain';
import { AIProcessingError } from '@pocketwardrobe/domain';

const BASE_URL = 'https://api.nanobanana.ai';
const API_KEY = 'test-api-key';
const IMAGE_BUFFER = Buffer.from('fake-image-data');

const VALID_NANO_BANANA_RESPONSE = {
  backgroundRemovedUrl: 'https://cdn.nanobanana.ai/bg-removed/abc123.png',
  classification: {
    name: 'Blue Denim Jacket',
    category: 'outerwear',
    subcategory: 'jacket',
    color: 'blue',
    colorHex: '#4169E1',
    seasons: ['spring', 'autumn'],
    occasions: ['casual'],
    fabric: 'denim',
    confidence: 0.92,
  },
};

describe('NanaBananaAdapter', () => {
  let adapter: NanaBananaAdapter;

  beforeEach(() => {
    adapter = new NanaBananaAdapter({
      apiKey: API_KEY,
      baseUrl: BASE_URL,
      timeoutMs: 5000,
      retryDelayMs: 0, // no delay in tests
    });
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  // Behavior 1: 200 response → populated AIClassification returned
  describe('processImage with successful Nano Banana response', () => {
    it('returns an AIClassification value object with domain fields populated from API response', async () => {
      nock(BASE_URL)
        .post('/process')
        .reply(200, VALID_NANO_BANANA_RESPONSE);

      const result = await adapter.processImage(IMAGE_BUFFER);

      expect(result.classification).toBeInstanceOf(AIClassification);
      expect(result.classification.category).toBe('outerwear');
      expect(result.classification.subcategory).toBe('jacket');
      expect(result.classification.color_primary).toBe('blue');
      expect(result.classification.color_hex).toBe('#4169E1');
      expect(result.classification.ai_confidence).toBe(0.92);
      expect(result.classification.seasons).toEqual(['spring', 'autumn']);
      expect(result.classification.occasions).toEqual(['casual']);
      expect(result.classification.fabric).toBe('denim');
    });

    it('returns the CDN backgroundRemovedUrl, not an S3 raw path (BR-06)', async () => {
      nock(BASE_URL)
        .post('/process')
        .reply(200, VALID_NANO_BANANA_RESPONSE);

      const result = await adapter.processImage(IMAGE_BUFFER);

      expect(result.backgroundRemovedUrl).toBe('https://cdn.nanobanana.ai/bg-removed/abc123.png');
      expect(result.backgroundRemovedUrl).toMatch(/^https:\/\/cdn\./);
    });

    it('sends the correct request payload to the Nano Banana API', async () => {
      let capturedBody: unknown;
      nock(BASE_URL)
        .post('/process', (body: unknown) => {
          capturedBody = body;
          return true;
        })
        .reply(200, VALID_NANO_BANANA_RESPONSE);

      await adapter.processImage(IMAGE_BUFFER);

      expect(capturedBody).toMatchObject({
        operations: expect.arrayContaining(['background-removal', 'classification']),
      });
    });
  });

  // Behavior 2: Non-2xx response → domain error (not HTTP error)
  describe('processImage with non-2xx Nano Banana response', () => {
    it('throws AIProcessingError with AI_CLASSIFICATION_FAILED on 400 response', async () => {
      nock(BASE_URL)
        .post('/process')
        .reply(400, { error: 'Bad image format' });

      let caughtError: unknown;
      try {
        await adapter.processImage(IMAGE_BUFFER);
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).toBeInstanceOf(AIProcessingError);
      expect((caughtError as AIProcessingError).errorCode).toBe('AI_CLASSIFICATION_FAILED');
      expect(caughtError).not.toBeInstanceOf(TypeError);
    });

    it('throws AIProcessingError (not a generic HTTP/network error class) on 503', async () => {
      nock(BASE_URL)
        .post('/process')
        .times(4) // initial + 3 retries
        .reply(503, { error: 'Service unavailable' });

      let caughtError: unknown;
      try {
        await adapter.processImage(IMAGE_BUFFER);
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).toBeInstanceOf(AIProcessingError);
      expect((caughtError as AIProcessingError).errorCode).toBe('AI_UNAVAILABLE');
      // Must NOT be an HTTP error type
      expect(caughtError).not.toBeInstanceOf(TypeError);
      expect((caughtError as Error).name).toBe('AIProcessingError');
    });
  });

  // Behavior 3: Retry with exponential backoff on 5xx
  describe('retry logic for transient failures', () => {
    it('succeeds on third attempt after two 503 failures (exponential backoff)', async () => {
      nock(BASE_URL)
        .post('/process')
        .reply(503, { error: 'Service unavailable' })
        .post('/process')
        .reply(503, { error: 'Service unavailable' })
        .post('/process')
        .reply(200, VALID_NANO_BANANA_RESPONSE);

      const result = await adapter.processImage(IMAGE_BUFFER);

      expect(result.classification).toBeInstanceOf(AIClassification);
      expect(result.classification.category).toBe('outerwear');
    });
  });

  // Behavior 4: Circuit breaker opens after 3 consecutive failures
  describe('circuit breaker behavior', () => {
    it('opens circuit after 3 consecutive failures and throws AIProcessingError without calling API again', async () => {
      // Trip the circuit breaker with 3 consecutive failures (each with retries)
      nock(BASE_URL)
        .post('/process')
        .times(12) // 3 trips × up to 4 calls each (initial + 3 retries)
        .reply(503, { error: 'Service unavailable' });

      // Trip the circuit 3 times
      await adapter.processImage(IMAGE_BUFFER).catch(() => {});
      await adapter.processImage(IMAGE_BUFFER).catch(() => {});
      await adapter.processImage(IMAGE_BUFFER).catch(() => {});

      // Now circuit should be open — no more API calls
      const pendingCalls = nock.pendingMocks().length;

      const result = await adapter.processImage(IMAGE_BUFFER).catch((err: unknown) => err);

      expect(result).toBeInstanceOf(AIProcessingError);
      expect((result as AIProcessingError).errorCode).toBe('AI_UNAVAILABLE');
      // Verify no additional API calls were made (nock still has same pending mocks)
      expect(nock.pendingMocks().length).toBe(pendingCalls);
    });
  });
});
