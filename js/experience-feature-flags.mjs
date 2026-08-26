const FALSE_VALUES = new Set(['', '0', 'false', 'off', 'no', 'disabled']);

function enabled(value) {
  if (value === true) return true;
  if (value == null || value === false) return false;
  return !FALSE_VALUES.has(String(value).trim().toLowerCase());
}

export function resolveExperienceFlags(source = {}) {
  return Object.freeze({
    nextProductShellEnabled: enabled(
      source.NEXT_PRODUCT_SHELL_ENABLED ?? source.nextProductShellEnabled
    ),
    universeEnabled: enabled(source.UNIVERSE_ENABLED ?? source.universeEnabled),
    tricksterStudioEnabled: enabled(
      source.TRICKSTER_STUDIO_ENABLED ?? source.tricksterStudioEnabled
    )
  });
}

export function mountAllowed(flagName, source = {}) {
  const flags = resolveExperienceFlags(source);
  if (!(flagName in flags)) return false;
  return flags[flagName] === true;
}
