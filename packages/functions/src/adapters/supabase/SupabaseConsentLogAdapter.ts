import type { SupabaseClient } from '@supabase/supabase-js';
import type { ConsentLogPort } from '@pocketwardrobe/domain';

// ── SupabaseConsentLogAdapter ─────────────────────────────────────────────────
//
// GDPR consent log adapter. Records are retained even after account deletion
// per regulatory requirement (3-year minimum hold).

export class SupabaseConsentLogAdapter implements ConsentLogPort {
  constructor(private readonly client: SupabaseClient) {}

  async logConsent(userId: string, granted: boolean): Promise<void> {
    const { error } = await this.client.from('consent_log').insert({
      user_id: userId,
      consent_type: 'photo_storage',
      consent_version: 'v1.0',
      granted,
      granted_at: new Date().toISOString(),
      revoked_at: granted ? null : new Date().toISOString(),
    });

    if (error) {
      throw new Error(`SupabaseConsentLogAdapter.logConsent failed: ${error.message}`);
    }
  }

  async isConsentGranted(userId: string): Promise<boolean> {
    // Most recent consent record determines current state
    const { data, error } = await this.client
      .from('consent_log')
      .select('granted')
      .eq('user_id', userId)
      .eq('consent_type', 'photo_storage')
      .order('granted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(
        `SupabaseConsentLogAdapter.isConsentGranted failed: ${error.message}`,
      );
    }

    if (!data) return false;

    return (data as { granted: boolean }).granted === true;
  }
}
