/**
 * Outbound port — Image binary storage.
 *
 * Adapters implementing this port delegate to object storage (e.g. S3, GCS).
 * Must only be invoked after ConsentLogPort.isConsentGranted returns true.
 *
 * No domain entity types are needed in signatures — images are referenced
 * by an opaque key string and returned as a URL string.
 */
export interface ImageStorePort {
  /**
   * Store image bytes under the given key.
   *
   * @param key     Opaque storage key (e.g. "items/{itemId}/original").
   * @param buffer  Raw image bytes to store.
   * @returns       Public or pre-signed URL at which the image can be accessed.
   */
  store(key: string, buffer: Buffer): Promise<string>;

  /**
   * Delete the image stored under the given key.
   *
   * @param key  Opaque storage key previously returned by store().
   */
  delete(key: string): Promise<void>;
}
