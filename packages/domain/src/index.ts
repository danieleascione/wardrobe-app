// Domain errors
export { AIProcessingError } from './errors/AIProcessingError.js';
export type { AIProcessingErrorCode } from './errors/AIProcessingError.js';

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

// Outbound ports
export type { ItemRepositoryPort } from './ports/outbound/ItemRepositoryPort.js';
export type { WardrobeRepositoryPort } from './ports/outbound/WardrobeRepositoryPort.js';
export type { OutfitRepositoryPort } from './ports/outbound/OutfitRepositoryPort.js';
export type { WearEventRepositoryPort } from './ports/outbound/WearEventRepositoryPort.js';
export type { StyleProfileRepositoryPort } from './ports/outbound/StyleProfileRepositoryPort.js';
export type { AIProcessorPort } from './ports/outbound/AIProcessorPort.js';
export type { WeatherServicePort } from './ports/outbound/WeatherServicePort.js';
export type { ConsentLogPort } from './ports/outbound/ConsentLogPort.js';
export type { ImageStorePort } from './ports/outbound/ImageStorePort.js';
export type { AIQualityLogPort } from './ports/outbound/AIQualityLogPort.js';

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
