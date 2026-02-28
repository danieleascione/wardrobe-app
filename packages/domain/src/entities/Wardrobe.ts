// BR-01: First outfit suggestion requires wardrobe.item_count >= 5
// item_count is maintained by a DB trigger — do not compute in application code

export interface WardrobeProps {
  readonly wardrobe_id: string;
  readonly user_id: string;
  readonly item_count: number;
  readonly first_unlock_achieved: boolean;
  readonly created_at: Date;
  readonly updated_at: Date;
}

export class Wardrobe {
  readonly wardrobe_id: string;
  readonly user_id: string;
  readonly item_count: number;
  readonly first_unlock_achieved: boolean;
  readonly created_at: Date;
  readonly updated_at: Date;

  constructor(props: WardrobeProps) {
    this.wardrobe_id = props.wardrobe_id;
    this.user_id = props.user_id;
    this.item_count = props.item_count;
    this.first_unlock_achieved = props.first_unlock_achieved;
    this.created_at = props.created_at;
    this.updated_at = props.updated_at;
    Object.freeze(this);
  }

  // BR-01: Outfit suggestion only possible when wardrobe has at least 5 items
  canSuggestOutfit(): boolean {
    return this.item_count >= 5;
  }
}
