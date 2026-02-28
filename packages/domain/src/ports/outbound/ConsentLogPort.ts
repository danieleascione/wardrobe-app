/**
 * Outbound port — GDPR photo storage consent log.
 *
 * Use cases must check isConsentGranted before invoking ImageStorePort.
 * logConsent records the user's explicit consent decision with a timestamp
 * in the infrastructure layer.
 *
 * No domain entity types are needed — consent is identified by userId alone.
 */
export interface ConsentLogPort {
  /**
   * Record the user's photo storage consent decision.
   *
   * @param userId  Identifier of the user giving or revoking consent.
   * @param granted true when consent is given, false when revoked.
   */
  logConsent(userId: string, granted: boolean): Promise<void>;

  /**
   * Check whether the user has granted photo storage consent.
   *
   * @param userId  Identifier of the user to check.
   * @returns       true when consent is currently granted, false otherwise.
   */
  isConsentGranted(userId: string): Promise<boolean>;
}
