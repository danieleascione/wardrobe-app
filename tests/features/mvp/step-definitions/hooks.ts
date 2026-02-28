import { Before, After } from '@cucumber/cucumber';
import { Wardrobe } from '../../../../packages/domain/src/entities/Wardrobe.js';
import { WalkingSkeletonWorld } from './world.js';

Before(async function (this: WalkingSkeletonWorld) {
  // Reset scenario state — adapters are freshly constructed in the World
  // constructor; the Before hook only resets accumulated state.
  this.state = {
    confirmedItems: [],
  };

  // Pre-grant photo storage consent for the test user.
  // In the test profile, consent is assumed granted — callers do not need
  // to explicitly record consent before digitizing items.
  await this.consentLog.logConsent(this.userId, true);

  // Seed an empty wardrobe entity for the test user so that
  // WardrobeRepositoryPort.findByUserId returns a Wardrobe (rather than null)
  // from the start. item_count starts at 0 and is updated by syncWardrobeItemCount()
  // after each item confirmation.
  const now = new Date();
  await this.wardrobeRepo.save(
    new Wardrobe({
      wardrobe_id: this.wardrobeId,
      user_id: this.userId,
      item_count: 0,
      first_unlock_achieved: false,
      created_at: now,
      updated_at: now,
    }),
  );
});

After(async function (_this: WalkingSkeletonWorld) {
  // In-memory adapters are garbage-collected when the World is destroyed.
  // Nothing to clean up.
});
