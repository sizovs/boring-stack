// As a performance optimization:
// 🔴 Type's constructor is not called.
// 🔴 Type's default initializers are not run.
// 🔴 Type's private fields are not accessible.
// 🟢 Only Types's methods, getters, and setters will be attached to the final instance (+ row's fields, of course).
export const as = Type => (row) => {
  const instance = Object.create(Type.prototype)
  return Object.assign(instance, row)
}
