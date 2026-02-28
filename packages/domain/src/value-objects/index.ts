// ── Color ─────────────────────────────────────────────────────────────────

export interface ColorProps {
  readonly primary: string;
  readonly hex?: string | null;
}

export class Color {
  readonly primary: string;
  readonly hex: string | null;

  constructor(props: ColorProps) {
    this.primary = props.primary;
    this.hex = props.hex ?? null;
    Object.freeze(this);
  }

  equals(other: Color): boolean {
    return this.primary === other.primary && this.hex === other.hex;
  }
}

// ── Category ─────────────────────────────────────────────────────────────

export interface CategoryProps {
  readonly category: string;
  readonly subcategory: string;
}

export class Category {
  readonly category: string;
  readonly subcategory: string;

  constructor(props: CategoryProps) {
    this.category = props.category;
    this.subcategory = props.subcategory;
    Object.freeze(this);
  }

  equals(other: Category): boolean {
    return this.category === other.category && this.subcategory === other.subcategory;
  }
}

// ── Season ───────────────────────────────────────────────────────────────

export type SeasonValue = 'spring' | 'summer' | 'autumn' | 'winter';

export interface SeasonProps {
  readonly values: ReadonlyArray<string>;
}

export class Season {
  readonly values: ReadonlyArray<string>;

  constructor(props: SeasonProps) {
    this.values = Object.freeze([...props.values]);
    Object.freeze(this);
  }

  equals(other: Season): boolean {
    if (this.values.length !== other.values.length) return false;
    return this.values.every((v, i) => v === other.values[i]);
  }
}

// ── Occasion ─────────────────────────────────────────────────────────────

export type OccasionValue = 'work' | 'casual' | 'sport' | 'events';

export interface OccasionProps {
  readonly values: ReadonlyArray<string>;
}

export class Occasion {
  readonly values: ReadonlyArray<string>;

  constructor(props: OccasionProps) {
    this.values = Object.freeze([...props.values]);
    Object.freeze(this);
  }

  equals(other: Occasion): boolean {
    if (this.values.length !== other.values.length) return false;
    return this.values.every((v, i) => v === other.values[i]);
  }
}

// ── WeatherContext ────────────────────────────────────────────────────────

export interface WeatherContextProps {
  readonly city: string;
  readonly date: string;
  readonly tempCelsius: number;
  readonly condition: string;
}

export class WeatherContext {
  readonly city: string;
  readonly date: string;
  readonly tempCelsius: number;
  readonly condition: string;

  constructor(props: WeatherContextProps) {
    this.city = props.city;
    this.date = props.date;
    this.tempCelsius = props.tempCelsius;
    this.condition = props.condition;
    Object.freeze(this);
  }

  equals(other: WeatherContext): boolean {
    return (
      this.city === other.city &&
      this.date === other.date &&
      this.tempCelsius === other.tempCelsius &&
      this.condition === other.condition
    );
  }
}

// ── AIClassification (transient — not persisted) ──────────────────────────

export interface AIClassificationProps {
  readonly name: string;
  readonly color_primary: string;
  readonly color_hex: string | null;
  readonly category: string;
  readonly subcategory: string;
  readonly seasons: ReadonlyArray<string>;
  readonly occasions: ReadonlyArray<string>;
  readonly fabric: string | null;
  readonly ai_confidence: number;
}

export class AIClassification {
  readonly name: string;
  readonly color_primary: string;
  readonly color_hex: string | null;
  readonly category: string;
  readonly subcategory: string;
  readonly seasons: ReadonlyArray<string>;
  readonly occasions: ReadonlyArray<string>;
  readonly fabric: string | null;
  readonly ai_confidence: number;

  constructor(props: AIClassificationProps) {
    this.name = props.name;
    this.color_primary = props.color_primary;
    this.color_hex = props.color_hex;
    this.category = props.category;
    this.subcategory = props.subcategory;
    this.seasons = Object.freeze([...props.seasons]);
    this.occasions = Object.freeze([...props.occasions]);
    this.fabric = props.fabric;
    this.ai_confidence = props.ai_confidence;
    Object.freeze(this);
  }

  equals(other: AIClassification): boolean {
    return (
      this.name === other.name &&
      this.color_primary === other.color_primary &&
      this.color_hex === other.color_hex &&
      this.category === other.category &&
      this.subcategory === other.subcategory &&
      this.ai_confidence === other.ai_confidence
    );
  }
}

// ── WardrobeStats (derived at query time — never persisted) ───────────────

export interface WardrobeStatsProps {
  readonly total_items: number;
  readonly unworn_count: number;
}

export class WardrobeStats {
  readonly total_items: number;
  readonly unworn_count: number;

  constructor(props: WardrobeStatsProps) {
    this.total_items = props.total_items;
    this.unworn_count = props.unworn_count;
    Object.freeze(this);
  }

  equals(other: WardrobeStats): boolean {
    return this.total_items === other.total_items && this.unworn_count === other.unworn_count;
  }
}
