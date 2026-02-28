// BR-09: Default StyleProfile on calibration skip: classic / work+casual / neutral

export type StyleArchetype = 'classic' | 'minimalist' | 'bold' | 'sporty' | 'romantic';
export type StylePalette = 'neutral' | 'vibrant' | 'monochrome' | 'earthy';

const DEFAULT_ARCHETYPE: StyleArchetype = 'classic';
const DEFAULT_OCCASION_PRIORITIES = Object.freeze(['work', 'casual']);
const DEFAULT_PALETTE: StylePalette = 'neutral';

export interface EffectivePreferences {
  readonly archetype: StyleArchetype;
  readonly occasion_priorities: ReadonlyArray<string>;
  readonly palette: StylePalette;
}

export interface StyleProfileProps {
  readonly style_profile_id: string;
  readonly user_id: string;
  readonly archetype: StyleArchetype;
  readonly occasion_priorities: ReadonlyArray<string>;
  readonly palette: StylePalette;
  readonly calibration_completed: boolean;
  readonly calibration_version: number;
  readonly created_at: Date;
  readonly updated_at: Date;
}

export class StyleProfile {
  readonly style_profile_id: string;
  readonly user_id: string;
  readonly archetype: StyleArchetype;
  readonly occasion_priorities: ReadonlyArray<string>;
  readonly palette: StylePalette;
  readonly calibration_completed: boolean;
  readonly calibration_version: number;
  readonly created_at: Date;
  readonly updated_at: Date;

  constructor(props: StyleProfileProps) {
    this.style_profile_id = props.style_profile_id;
    this.user_id = props.user_id;
    this.archetype = props.archetype;
    this.occasion_priorities = Object.freeze([...props.occasion_priorities]);
    this.palette = props.palette;
    this.calibration_completed = props.calibration_completed;
    this.calibration_version = props.calibration_version;
    this.created_at = props.created_at;
    this.updated_at = props.updated_at;
    Object.freeze(this);
  }

  // BR-09: Return defaults when calibration has not been completed
  effectivePreferences(): EffectivePreferences {
    if (!this.calibration_completed) {
      return {
        archetype: DEFAULT_ARCHETYPE,
        occasion_priorities: DEFAULT_OCCASION_PRIORITIES,
        palette: DEFAULT_PALETTE,
      };
    }
    return {
      archetype: this.archetype,
      occasion_priorities: this.occasion_priorities,
      palette: this.palette,
    };
  }
}
