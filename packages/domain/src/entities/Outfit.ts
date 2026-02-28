import type { WeatherContext } from '../value-objects/index.js';

// BR-03: Outfit must contain >= 3 Items
// Outfit is immutable after creation — no setters on item_ids

export type OutfitStatus = 'active' | 'invalidated';

export interface OutfitProps {
  readonly outfit_id: string;
  readonly user_id: string;
  readonly item_ids: ReadonlyArray<string>;
  readonly occasion: string;
  readonly weather_context: WeatherContext | null;
  readonly reasoning: string;
  readonly generated_at: Date;
  readonly suggestion_date: string; // ISO date string: YYYY-MM-DD
  readonly status: OutfitStatus;
}

export class Outfit {
  readonly outfit_id: string;
  readonly user_id: string;
  readonly item_ids: ReadonlyArray<string>;
  readonly occasion: string;
  readonly weather_context: WeatherContext | null;
  readonly reasoning: string;
  readonly generated_at: Date;
  readonly suggestion_date: string;
  readonly status: OutfitStatus;

  constructor(props: OutfitProps) {
    // BR-03: enforce minimum item count
    if (props.item_ids.length < 3) {
      throw new Error('Outfit must contain at least 3 items');
    }

    this.outfit_id = props.outfit_id;
    this.user_id = props.user_id;
    this.item_ids = Object.freeze([...props.item_ids]);
    this.occasion = props.occasion;
    this.weather_context = props.weather_context;
    this.reasoning = props.reasoning;
    this.generated_at = props.generated_at;
    this.suggestion_date = props.suggestion_date;
    this.status = props.status;
    Object.freeze(this);
  }
}
