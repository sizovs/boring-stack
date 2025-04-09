function escape(str) {
  const chars = {
    "&": "&amp;",
    ">": "&gt;",
    "<": "&lt;",
    '"': "&quot;",
    "'": "&#39;",
    "`": "&#96;",
  }

  let result = String(str)
  for (const char in chars) {
    result = result.split(char).join(chars[char])
  }
  return result
}

export const html = (fragments, ...values) => {
  return fragments.raw.reduce((acc, fragment, i) => {
    let value = values[i - 1]
    if (Array.isArray(value)) {
      // If value is array, then just concatenate the values.
      // Useful for HTML lists: <ul>${names.map((name) => html`<li>${name}</li>`)}</ul>
      value = value.join("")
    } else if (fragments.raw[i - 1].endsWith("$")) {
      // If the interpolation is preceded by a dollar sign,
      // substitution is considered safe and will not be escaped
      acc = acc.slice(0, -1)
    } else {
      // For everything else, escape the value
      // to prevent XSS attacks
      value = escape(value)
    }

    return acc + value + fragment
  })

}
