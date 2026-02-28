// Domain entities
export { Item } from './entities/Item.js';
export type { ItemProps, ItemStatus } from './entities/Item.js';

export { Wardrobe } from './entities/Wardrobe.js';
export type { WardrobeProps } from './entities/Wardrobe.js';

export { StyleProfile } from './entities/StyleProfile.js';
export type { StyleProfileProps, EffectivePreferences, StyleArchetype, StylePalette } from './entities/StyleProfile.js';

export { Outfit } from './entities/Outfit.js';
export type { OutfitProps, OutfitStatus } from './entities/Outfit.js';

export { WearEvent } from './entities/WearEvent.js';
export type { WearEventProps } from './entities/WearEvent.js';

// Value objects
export {
  Color,
  Category,
  Season,
  Occasion,
  WeatherContext,
  AIClassification,
  WardrobeStats,
} from './value-objects/index.js';
export type {
  ColorProps,
  CategoryProps,
  SeasonProps,
  SeasonValue,
  OccasionProps,
  OccasionValue,
  WeatherContextProps,
  AIClassificationProps,
  WardrobeStatsProps,
} from './value-objects/index.js';
