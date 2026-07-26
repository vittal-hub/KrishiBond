const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyAccessToken } = require('../utils/token');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new ApiError(401, 'Not authenticated');
  }
  const token = header.split(' ')[1];
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired token');
  }
  const user = await User.findById(payload.sub);
  if (!user) throw new ApiError(401, 'User no longer exists');
  req.user = user;
  next();
});

module.exports = { protect };
