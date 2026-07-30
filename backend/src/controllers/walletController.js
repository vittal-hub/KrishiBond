const asyncHandler = require('../utils/asyncHandler');
const { getOrCreateWallet } = require('../services/wallet.service');

const getMyWallet = asyncHandler(async (req, res) => {
  const wallet = await getOrCreateWallet(req.user._id);
  res.json({ success: true, wallet });
});

module.exports = { getMyWallet };
