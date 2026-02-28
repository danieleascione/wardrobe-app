// BR-05: WearEvent created only on explicit user accept — not on view
// WearEvent requires an explicit outfit reference and a final items list

export interface WearEventProps {
  readonly wear_event_id: string;
  readonly user_id: string;
  readonly outfit_id: string; // FK to outfit_suggestions — required
  readonly items_worn: ReadonlyArray<string>; // final items (may differ from outfit.item_ids after swap)
  readonly worn_date: string; // ISO date string: YYYY-MM-DD
  readonly created_at: Date;
}

export class WearEvent {
  readonly wear_event_id: string;
  readonly user_id: string;
  readonly outfit_id: string;
  readonly items_worn: ReadonlyArray<string>;
  readonly worn_date: string;
  readonly created_at: Date;

  constructor(props: WearEventProps) {
    // BR-05: WearEvent must reference the outfit that was accepted
    if (!props.outfit_id) {
      throw new Error('WearEvent requires an explicit outfit reference');
    }

    // WearEvent must record at least one item worn
    if (props.items_worn.length === 0) {
      throw new Error('WearEvent requires at least one item worn');
    }

    this.wear_event_id = props.wear_event_id;
    this.user_id = props.user_id;
    this.outfit_id = props.outfit_id;
    this.items_worn = Object.freeze([...props.items_worn]);
    this.worn_date = props.worn_date;
    this.created_at = props.created_at;
    Object.freeze(this);
  }
}
