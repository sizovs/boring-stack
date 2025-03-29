export async function retry(fn, attempts = 5, delay = 1000) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === attempts) throw new Error(`Failed after ${attempts} attempts: ${error.message}`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}
