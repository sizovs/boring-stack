import flash from "req-flash"
export const enableFlashScope = ({ app }) => {
  app.use(flash())
  // Make flash attributes available to template engine
  app.use((request, response, next) => {
    const originalRender = response.render
    response.render = (view, options, callback) => {
      options.flash = request.flash()
      originalRender.call(response, view, options, callback)
    }
    next()
  })
}
