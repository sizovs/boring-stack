import todos from './todos/todos.js'

export default (app) => {
  app.use('/todos', todos)
  app.use('/', (request, response) => {
    response.redirect('/todos');
  });
};

