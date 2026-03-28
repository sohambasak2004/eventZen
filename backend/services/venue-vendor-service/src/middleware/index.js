const auth = require('./auth');
const errorHandler = require('./errorHandler');
const validation = require('./validation');
const logging = require('./logging');

module.exports = {
  ...auth,
  ...errorHandler,
  ...validation,
  ...logging
};