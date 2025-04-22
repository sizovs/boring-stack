export const load = async view => {
  const isDevMode = process.env.NODE_ENV !== "production"
  const freshModifier = isDevMode ? `?${Date.now()}` : ''
  return await import(`#application/views/${view}${freshModifier}`)
}
