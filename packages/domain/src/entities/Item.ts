export type ItemStatus = 'active' | 'pending_ai' | 'pending_review' | 'deleted';

export interface ItemProps {
  readonly item_id: string;
  readonly user_id: string;
  readonly wardrobe_id: string;

  // Photo — BR-06: photo_url_thumbnail must reference background-removed version
  readonly photo_url_original: string;
  readonly photo_url_thumbnail: string;

  // AI-extracted metadata
  readonly name: string;
  readonly color_primary: string;
  readonly color_hex: string | null;
  readonly category: string;
  readonly subcategory: string;
  readonly seasons: ReadonlyArray<string>;
  readonly occasions: ReadonlyArray<string>;
  readonly fabric: string | null;

  // Classification provenance
  readonly ai_confidence: number | null;
  readonly manual_classification: boolean;

  // Wear tracking (derived on query)
  readonly last_worn_at: Date | null;
  readonly created_at: Date;
  readonly updated_at: Date;

  // Lifecycle
  readonly status: ItemStatus;
}

export class Item {
  readonly item_id: string;
  readonly user_id: string;
  readonly wardrobe_id: string;
  readonly photo_url_original: string;
  readonly photo_url_thumbnail: string;
  readonly name: string;
  readonly color_primary: string;
  readonly color_hex: string | null;
  readonly category: string;
  readonly subcategory: string;
  readonly seasons: ReadonlyArray<string>;
  readonly occasions: ReadonlyArray<string>;
  readonly fabric: string | null;
  readonly ai_confidence: number | null;
  readonly manual_classification: boolean;
  readonly last_worn_at: Date | null;
  readonly created_at: Date;
  readonly updated_at: Date;
  readonly status: ItemStatus;

  constructor(props: ItemProps) {
    this.item_id = props.item_id;
    this.user_id = props.user_id;
    this.wardrobe_id = props.wardrobe_id;
    this.photo_url_original = props.photo_url_original;
    this.photo_url_thumbnail = props.photo_url_thumbnail;
    this.name = props.name;
    this.color_primary = props.color_primary;
    this.color_hex = props.color_hex;
    this.category = props.category;
    this.subcategory = props.subcategory;
    this.seasons = Object.freeze([...props.seasons]);
    this.occasions = Object.freeze([...props.occasions]);
    this.fabric = props.fabric;
    this.ai_confidence = props.ai_confidence;
    this.manual_classification = props.manual_classification;
    this.last_worn_at = props.last_worn_at;
    this.created_at = props.created_at;
    this.updated_at = props.updated_at;
    this.status = props.status;
    Object.freeze(this);
  }
}
