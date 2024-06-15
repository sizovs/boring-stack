import flash from "req-flash"
export const enableFlashScope = ({ app }) => {
  app.use(flash())
  // Make flash attributes available to template engine
  app.use((request, response, next) => {
    const originalRender = response.render
    response.render = (view, options, callback) => {
      const currentFlash = request.flash()
      options.flash = Object.keys(currentFlash).length > 0 ? currentFlash : { errors: {}, old: {} }
      originalRender.call(response, view, options, callback)
    }
    next()
  })
}
