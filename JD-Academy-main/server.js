const app = require('./app');
const { PORT, NODE_ENV } = require('./config');

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT} [${NODE_ENV}]`);
});
