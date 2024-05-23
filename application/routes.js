import todos from './todos/todos.js'

export default (app) => {
  app.use('/todos', todos)
  app.use('/health', (request, response) => {
    response.sendStatus(200)
  })
  app.use('/', (request, response) => {
    response.redirect('/todos');
  });
};

