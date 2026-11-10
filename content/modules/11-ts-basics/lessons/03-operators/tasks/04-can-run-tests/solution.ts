export function canRunTests(isBuildGreen: boolean, isEnvUp: boolean, hasOverride: boolean): boolean {
  return (isBuildGreen && isEnvUp) || hasOverride;
}
