require('dotenv').config();
const app = require('../src/app');

module.exports = (req, res) => {
  if (!req.path) {
    req.url = `/${req.url}`;
  }
  app(req, res);
};
