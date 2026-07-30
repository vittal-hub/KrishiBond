const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { jwt: jwtConfig } = require('../config/env');

const JWT_ALGORITHM = 'HS256';

function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    jwtConfig.accessSecret,
    { expiresIn: jwtConfig.accessExpiresIn, algorithm: JWT_ALGORITHM }
  );
}

function signRefreshToken(user) {
  const tokenId = uuidv4();
  const token = jwt.sign(
    { sub: user._id.toString(), tokenId },
    jwtConfig.refreshSecret,
    { expiresIn: jwtConfig.refreshExpiresIn, algorithm: JWT_ALGORITHM }
  );
  return { token, tokenId };
}

// Explicitly pinning the allowed algorithm (rather than letting the library
// infer it) prevents an algorithm-confusion attack where a token is crafted
// with a different alg the server would otherwise still accept.
function verifyAccessToken(token) {
  return jwt.verify(token, jwtConfig.accessSecret, { algorithms: [JWT_ALGORITHM] });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, jwtConfig.refreshSecret, { algorithms: [JWT_ALGORITHM] });
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };
