/** Freezes a rules object and each of its groups. */
export function freezeRules<T extends object>(rules: T): T {
  for (const group of Object.values(rules)) Object.freeze(group);
  return Object.freeze(rules);
}

/** Applies an override to one rules group; throws a `TypeError` on a value that is not a finite number of 0 or more. */
export function mergeRuleGroup<T extends object>(
  group: string,
  defaults: T,
  override: Partial<T> | undefined,
): T {
  if (override === undefined) return defaults;
  const merged = { ...defaults, ...override };
  for (const [key, value] of Object.entries(merged)) {
    if (value !== null && (typeof value !== 'number' || !Number.isFinite(value) || value < 0)) {
      throw new TypeError(`rules.${group}.${key} must be a finite number of 0 or more`);
    }
  }
  return merged;
}
