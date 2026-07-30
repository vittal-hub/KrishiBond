const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');
const { toUserDTO, toPublicUserDTO } = require('../utils/dto');

const updateMe = asyncHandler(async (req, res) => {
  const allowed = ['name', 'phone', 'location', 'bio'];
  const updates = {};
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  });

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  if (!user) throw new ApiError(404, 'User not found');

  const isComplete = Boolean(user.name && user.phone && user.location?.state && user.location?.district);
  if (isComplete !== user.profileCompleted) {
    user.profileCompleted = isComplete;
    await user.save();
  }

  res.json({ success: true, user: toUserDTO(user) });
});

const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  const isSelfOrAdmin = req.user._id.toString() === user._id.toString() || req.user.role === 'admin';
  res.json({ success: true, user: isSelfOrAdmin ? toUserDTO(user) : toPublicUserDTO(user) });
});

module.exports = { updateMe, getUserById };
