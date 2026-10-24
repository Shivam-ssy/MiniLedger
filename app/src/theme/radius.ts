export const radius = {
  sm: 12,
  lg: 20,
  pill: 9999,
} as const;

export type RadiusKey = keyof typeof radius;
