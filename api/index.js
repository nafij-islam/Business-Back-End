const serverlessHandler = require('../dist/src/serverless');
module.exports = serverlessHandler.default || serverlessHandler;
