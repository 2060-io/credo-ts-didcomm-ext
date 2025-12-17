// Local helper: credo-ts/didcomm’s DateParser isn’t a public export; importing from build/* breaks bundlers/resolvers.
export const toDate = (value: unknown) => {
  if (value instanceof Date) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? value : parsed
  }
  return value
}
