export function alwaysArray(maybeArray) {
  if (!maybeArray) {
    return []
  }
  return Array.isArray(maybeArray) ? maybeArray : [maybeArray]
}
