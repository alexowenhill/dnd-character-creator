/**
 * The level the party starts at. Set PARTY_LEVEL in the site environment to
 * change it for everyone; the wizard offers it as the default.
 */
export const DEFAULT_LEVEL = (() => {
  const value = Number(process.env.PARTY_LEVEL ?? process.env.NEXT_PUBLIC_PARTY_LEVEL ?? 5)
  return Number.isInteger(value) && value >= 1 && value <= 20 ? value : 5
})()
