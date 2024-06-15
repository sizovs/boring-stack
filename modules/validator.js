import vine, { errors } from '@vinejs/vine'
vine.convertEmptyStringsToNull = true

async function validateBody(request, schema) {
  const body = request.body
  try {
    const validObject = await schema.validate(body)
    return [validObject, null]
  } catch (error) {
    if (error instanceof errors.E_VALIDATION_ERROR) {
      const errors = Object.groupBy(error.messages, ({ field }) => field)
      request.flash('errors', errors)
      request.flash('old', body)
      return [null, errors]
    } else {
      throw error
    }
  }
}

export { vine, validateBody }
