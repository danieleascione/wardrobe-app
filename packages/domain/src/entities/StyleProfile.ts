export type StyleArchetype = 'classic' | 'minimalist' | 'bold' | 'sporty' | 'romantic';
export type StylePalette = 'neutral' | 'vibrant' | 'monochrome' | 'earthy';

// BR-09: Default calibration values when user skips style setup
export const DEFAULT_STYLE_ARCHETYPE: StyleArchetype = 'classic';
export const DEFAULT_STYLE_OCCASION_PRIORITIES: ReadonlyArray<string> = Object.freeze(['work', 'casual']);
export const DEFAULT_STYLE_PALETTE: StylePalette = 'neutral';

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

  // BR-09: return defaults when calibration has not been completed
  effectivePreferences(): EffectivePreferences {
    if (!this.calibration_completed) {
      return {
        archetype: DEFAULT_STYLE_ARCHETYPE,
        occasion_priorities: DEFAULT_STYLE_OCCASION_PRIORITIES,
        palette: DEFAULT_STYLE_PALETTE,
      };
    }
    return {
      archetype: this.archetype,
      occasion_priorities: this.occasion_priorities,
      palette: this.palette,
    };
  }
}
