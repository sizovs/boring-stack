import todos from './todos/todos.js'
import health from './health.js'

export default (app) => {
  app.use('/todos', todos)
  app.use('/health', health)
  app.use('/', (request, response) => {
    response.redirect('/todos');
  });
};

