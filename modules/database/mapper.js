export function as(type) {
  return item => new type(item)
}
