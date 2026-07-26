const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { jwt: jwtConfig } = require('../config/env');

function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    jwtConfig.accessSecret,
    { expiresIn: jwtConfig.accessExpiresIn }
  );
}

function signRefreshToken(user) {
  const tokenId = uuidv4();
  const token = jwt.sign(
    { sub: user._id.toString(), tokenId },
    jwtConfig.refreshSecret,
    { expiresIn: jwtConfig.refreshExpiresIn }
  );
  return { token, tokenId };
}

function verifyAccessToken(token) {
  return jwt.verify(token, jwtConfig.accessSecret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, jwtConfig.refreshSecret);
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };
