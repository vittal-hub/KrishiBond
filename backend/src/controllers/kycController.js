const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Kyc = require('../models/Kyc');
const { notifyUser } = require('../utils/notify');
const { recordAudit } = require('../utils/auditLog');

function toKycDTO(kyc) {
  const obj = kyc.toObject ? kyc.toObject() : kyc;
  return {
    id: obj._id,
    user: obj.user,
    aadhaarNumber: obj.aadhaarNumber,
    panNumber: obj.panNumber,
    bankDetails: obj.bankDetails,
    status: obj.status,
    rejectionReason: obj.rejectionReason,
    reviewedAt: obj.reviewedAt,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

// Submit or update KYC details. Re-submitting after a rejection resets status
// to `pending` so it re-enters the admin review queue.
const submitKyc = asyncHandler(async (req, res) => {
  const { aadhaarNumber, panNumber, bankDetails } = req.body;
  const updates = { status: 'pending', rejectionReason: undefined, reviewedBy: undefined, reviewedAt: undefined };
  if (aadhaarNumber !== undefined) updates.aadhaarNumber = aadhaarNumber;
  if (panNumber !== undefined) updates.panNumber = panNumber;
  if (bankDetails !== undefined) updates.bankDetails = bankDetails;

  const kyc = await Kyc.findOneAndUpdate(
    { user: req.user._id },
    { $set: updates, $setOnInsert: { user: req.user._id } },
    { new: true, upsert: true, runValidators: true }
  );

  res.status(200).json({ success: true, kyc: toKycDTO(kyc) });
});

const getMyKyc = asyncHandler(async (req, res) => {
  const kyc = await Kyc.findOne({ user: req.user._id });
  res.json({ success: true, kyc: kyc ? toKycDTO(kyc) : null });
});

// --- Admin ---

const KYC_STATUSES = ['pending', 'approved', 'rejected'];

const listKyc = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = typeof status === 'string' && KYC_STATUSES.includes(status) ? { status } : {};
  const kycs = await Kyc.find(filter).populate('user', 'name email role').sort('-createdAt');
  res.json({ success: true, kycs: kycs.map(toKycDTO) });
});

const approveKyc = asyncHandler(async (req, res) => {
  const kyc = await Kyc.findByIdAndUpdate(
    req.params.id,
    { status: 'approved', rejectionReason: undefined, reviewedBy: req.user._id, reviewedAt: new Date() },
    { new: true }
  );
  if (!kyc) throw new ApiError(404, 'KYC submission not found');

  await recordAudit(req, { action: 'KYC_APPROVE', entityType: 'Kyc', entityId: kyc._id, after: { status: kyc.status } });

  await notifyUser(req.app.get('io'), kyc.user, {
    type: 'kyc_approved',
    category: 'kyc',
    message: 'Your KYC verification has been approved',
    link: '/profile',
  });

  res.json({ success: true, kyc: toKycDTO(kyc) });
});

const rejectKyc = asyncHandler(async (req, res) => {
  const kyc = await Kyc.findByIdAndUpdate(
    req.params.id,
    {
      status: 'rejected',
      rejectionReason: req.body.rejectionReason || 'Documents could not be verified',
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
    },
    { new: true }
  );
  if (!kyc) throw new ApiError(404, 'KYC submission not found');

  await recordAudit(req, {
    action: 'KYC_REJECT',
    entityType: 'Kyc',
    entityId: kyc._id,
    after: { status: kyc.status, rejectionReason: kyc.rejectionReason },
  });

  await notifyUser(req.app.get('io'), kyc.user, {
    type: 'kyc_rejected',
    category: 'kyc',
    message: `Your KYC verification was rejected: ${kyc.rejectionReason}`,
    link: '/profile',
  });

  res.json({ success: true, kyc: toKycDTO(kyc) });
});

module.exports = { submitKyc, getMyKyc, listKyc, approveKyc, rejectKyc };
