export interface MarkupConfig {
  type: 'percentage' | 'fixed';
  value: number;
}

const DEFAULT_MARKUP_PERCENT = 10;

const defaultMarkup: MarkupConfig = {
  type: 'percentage',
  value: DEFAULT_MARKUP_PERCENT,
};

export function applyMarkup(wholesalePrice: number, config: MarkupConfig = defaultMarkup): number {
  if (config.type === 'percentage') {
    return Math.round(wholesalePrice * (1 + config.value / 100) * 100) / 100;
  }
  return Math.round((wholesalePrice + config.value) * 100) / 100;
}
