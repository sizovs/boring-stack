  // As a performance optimization:
  // 🔴 Type's constructor is not called.
  // 🔴 Type's default initializers are not run.
  // 🔴 Type's private fields are not accessible.
  // 🟢 Only Types's methods, getters, and setters will be attached to the final instance (+ row's fields, of course).
export function as(Type) {
  const instance = Object.create(Type.prototype)
  return row => {
    return Object.assign(instance, row)
  }
}
