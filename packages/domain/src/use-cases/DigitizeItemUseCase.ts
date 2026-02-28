import { Item } from '../entities/Item.js';
import { AIClassification } from '../value-objects/index.js';
import type { ItemRepositoryPort } from '../ports/outbound/ItemRepositoryPort.js';
import type { WardrobeRepositoryPort } from '../ports/outbound/WardrobeRepositoryPort.js';
import type { AIProcessorPort } from '../ports/outbound/AIProcessorPort.js';
import type { ImageStorePort } from '../ports/outbound/ImageStorePort.js';
import type { ConsentLogPort } from '../ports/outbound/ConsentLogPort.js';
import type { AIQualityLogPort } from '../ports/outbound/AIQualityLogPort.js';

function generateId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export class DigitizeItemUseCase {
  constructor(
    private readonly itemRepo: ItemRepositoryPort,
    private readonly wardrobeRepo: WardrobeRepositoryPort,
    private readonly aiProcessor: AIProcessorPort,
    private readonly imageStore: ImageStorePort,
    private readonly consentLog: ConsentLogPort,
    private readonly aiQualityLog: AIQualityLogPort,
  ) {}

  /**
   * Initiate digitization of a wardrobe item from a raw image buffer.
   *
   * - Checks consent before processing (GDPR)
   * - Calls AI to classify and background-remove the image
   * - BR-06: photo_url_thumbnail = backgroundRemovedUrl from AI
   * - Saves item with status 'pending_ai'
   */
  async initiateDigitization(
    userId: string,
    wardrobeId: string,
    imageBuffer: Buffer,
  ): Promise<Item> {
    const granted = await this.consentLog.isConsentGranted(userId);
    if (!granted) {
      throw new Error(`User ${userId} has not granted photo storage consent`);
    }

    const { classification, backgroundRemovedUrl } =
      await this.aiProcessor.processImage(imageBuffer);

    const now = new Date();
    const itemId = generateId();

    // Store original image (pre-background-removal)
    const originalUrl = await this.imageStore.store(
      `items/${itemId}/original`,
      imageBuffer,
    );

    const item = new Item({
      item_id: itemId,
      user_id: userId,
      wardrobe_id: wardrobeId,
      // BR-06: thumbnail must reference background-removed version
      photo_url_original: originalUrl,
      photo_url_thumbnail: backgroundRemovedUrl,
      name: classification.name,
      color_primary: classification.color_primary,
      color_hex: classification.color_hex,
      category: classification.category,
      subcategory: classification.subcategory,
      seasons: [...classification.seasons],
      occasions: [...classification.occasions],
      fabric: classification.fabric,
      ai_confidence: classification.ai_confidence,
      manual_classification: false,
      last_worn_at: null,
      created_at: now,
      updated_at: now,
      status: 'pending_ai',
    });

    await this.itemRepo.save(item);
    return item;
  }

  /**
   * Confirm a pending item — transitions it from pending_ai to active.
   *
   * item_count is maintained by a DB trigger — the use case does NOT call
   * wardrobeRepo.updateItemCount (BR-06 note: pending items excluded from count).
   */
  async confirmItem(userId: string, itemId: string): Promise<Item> {
    const existing = await this.itemRepo.findById(itemId);
    if (!existing) {
      throw new Error(`Item ${itemId} not found`);
    }

    const now = new Date();
    const confirmed = new Item({
      ...this.itemToProps(existing),
      status: 'active',
      updated_at: now,
    });

    await this.itemRepo.save(confirmed);
    return confirmed;
  }

  /**
   * Correct AI-generated metadata for an item.
   *
   * BR-10: logs the correction (predicted vs corrected) via AIQualityLogPort
   * so that AI model improvement pipelines can learn from user feedback.
   */
  async correctMetadata(
    userId: string,
    itemId: string,
    correctedCategory: string,
    correctedSubcategory: string,
  ): Promise<Item> {
    const existing = await this.itemRepo.findById(itemId);
    if (!existing) {
      throw new Error(`Item ${itemId} not found`);
    }

    // Build predicted and corrected AIClassification for the quality log
    const predicted = new AIClassification({
      name: existing.name,
      color_primary: existing.color_primary,
      color_hex: existing.color_hex,
      category: existing.category,
      subcategory: existing.subcategory,
      seasons: [...existing.seasons],
      occasions: [...existing.occasions],
      fabric: existing.fabric,
      ai_confidence: existing.ai_confidence ?? 0,
    });

    const corrected = new AIClassification({
      name: existing.name,
      color_primary: existing.color_primary,
      color_hex: existing.color_hex,
      category: correctedCategory,
      subcategory: correctedSubcategory,
      seasons: [...existing.seasons],
      occasions: [...existing.occasions],
      fabric: existing.fabric,
      ai_confidence: existing.ai_confidence ?? 0,
    });

    // BR-10: log correction before persisting update
    await this.aiQualityLog.logCorrection(itemId, predicted, corrected);

    const now = new Date();
    const updated = new Item({
      ...this.itemToProps(existing),
      category: correctedCategory,
      subcategory: correctedSubcategory,
      manual_classification: true,
      updated_at: now,
    });

    await this.itemRepo.save(updated);
    return updated;
  }

  /**
   * Delete an item from the wardrobe.
   * item_count is decremented by a DB trigger — no manual decrement here.
   */
  async deleteItem(userId: string, itemId: string): Promise<void> {
    await this.itemRepo.delete(itemId);
  }

  private itemToProps(item: Item) {
    return {
      item_id: item.item_id,
      user_id: item.user_id,
      wardrobe_id: item.wardrobe_id,
      photo_url_original: item.photo_url_original,
      photo_url_thumbnail: item.photo_url_thumbnail,
      name: item.name,
      color_primary: item.color_primary,
      color_hex: item.color_hex,
      category: item.category,
      subcategory: item.subcategory,
      seasons: [...item.seasons],
      occasions: [...item.occasions],
      fabric: item.fabric,
      ai_confidence: item.ai_confidence,
      manual_classification: item.manual_classification,
      last_worn_at: item.last_worn_at,
      created_at: item.created_at,
      updated_at: item.updated_at,
      status: item.status,
    };
  }
}
