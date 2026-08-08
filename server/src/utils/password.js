const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

function hashPassword(password) {
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

function comparePassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

module.exports = { hashPassword, comparePassword };
