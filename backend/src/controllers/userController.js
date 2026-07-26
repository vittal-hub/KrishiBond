const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');
const { toUserDTO } = require('../utils/dto');

const updateMe = asyncHandler(async (req, res) => {
  const allowed = ['name', 'phone', 'location'];
  const updates = {};
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  });

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ success: true, user: toUserDTO(user) });
});

const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ success: true, user: toUserDTO(user) });
});

module.exports = { updateMe, getUserById };
