export const html = (fragments, ...values) => {
  let out = ""
  fragments.forEach((string, i) => {
    const value = values[i]

    // Array - Join to string and output with value
    if (Array.isArray(value)) {
      out += string + value.join("")
    }
    // String - Output with value
    else if (typeof value === "string") {
      out += string + value
    }
    // Number - Coerce to string and output with value
    // This would happen anyway, but for clarity's sake on what's happening here
    else if (typeof value === "number") {
      out += string + String(value)
    }
    // object, undefined, null, boolean - Don't output a value.
    else {
      out += string
    }
  })

  return out
}

