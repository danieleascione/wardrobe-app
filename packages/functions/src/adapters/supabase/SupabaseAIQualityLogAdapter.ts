import type { SupabaseClient } from '@supabase/supabase-js';
import type { AIQualityLogPort } from '@pocketwardrobe/domain';
import type { AIClassification } from '@pocketwardrobe/domain';

// ── SupabaseAIQualityLogAdapter ───────────────────────────────────────────────
//
// Records AI classification corrections for model improvement (BR-10).
// Correction rate per category is queryable via:
//   SELECT predicted_cat,
//          COUNT(*) FILTER (WHERE corrected_cat IS NOT NULL AND corrected_cat != predicted_cat)
//            AS corrections,
//          COUNT(*) AS total,
//          ROUND(
//            COUNT(*) FILTER (WHERE corrected_cat IS NOT NULL AND corrected_cat != predicted_cat)
//              * 100.0 / NULLIF(COUNT(*), 0), 2
//          ) AS correction_rate_pct
//   FROM ai_quality_log
//   GROUP BY predicted_cat
//   ORDER BY correction_rate_pct DESC;

export class SupabaseAIQualityLogAdapter implements AIQualityLogPort {
  constructor(private readonly client: SupabaseClient) {}

  async logCorrection(
    itemId: string,
    predicted: AIClassification,
    corrected: AIClassification,
  ): Promise<void> {
    // Resolve user_id from item FK for the log record
    const { data: itemData, error: itemError } = await this.client
      .from('items')
      .select('user_id')
      .eq('item_id', itemId)
      .maybeSingle();

    if (itemError) {
      throw new Error(
        `SupabaseAIQualityLogAdapter.logCorrection: item lookup failed: ${itemError.message}`,
      );
    }

    const userId = (itemData as { user_id: string } | null)?.user_id ?? null;

    const { error } = await this.client.from('ai_quality_log').insert({
      user_id: userId,
      item_id: itemId,
      predicted_cat: predicted.category,
      corrected_cat: corrected.category,
      predicted_subcat: predicted.subcategory,
      corrected_subcat: corrected.subcategory,
      ai_confidence: predicted.ai_confidence,
      logged_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(
        `SupabaseAIQualityLogAdapter.logCorrection failed: ${error.message}`,
      );
    }
  }
}
