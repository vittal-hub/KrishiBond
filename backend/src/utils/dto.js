// Small helpers to map Mongoose docs to plain response DTOs the frontend expects.

function toListingDTO(listing, currentUserId) {
  const obj = listing.toObject ? listing.toObject() : listing;
  const owner = obj.owner || {};
  const category = obj.category || {};
  const favouritedBy = obj.favouritedBy || [];
  return {
    id: obj._id,
    cropType: obj.cropType,
    category: category._id ? { id: category._id, name: category.name, slug: category.slug } : obj.category || null,
    quantity: obj.quantity,
    unit: obj.unit,
    pricePerUnit: obj.pricePerUnit,
    expectedYield: obj.expectedYield,
    harvestDate: obj.harvestDate,
    organic: obj.organic,
    storageFacility: obj.storageFacility,
    deliveryAvailable: obj.deliveryAvailable,
    location: obj.location,
    description: obj.description,
    availableFrom: obj.availableFrom,
    status: obj.status,
    images: obj.images || [],
    qualityCertificates: obj.qualityCertificates || [],
    favouritesCount: favouritedBy.length,
    isFavourited: currentUserId ? favouritedBy.some((id) => id.toString() === currentUserId.toString()) : false,
    ownerId: owner._id || obj.owner,
    ownerName: owner.name || undefined,
    ownerRole: owner.role || undefined,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

function toUserDTO(user) {
  const obj = user.toObject ? user.toObject() : user;
  return {
    id: obj._id,
    name: obj.name,
    email: obj.email,
    role: obj.role,
    phone: obj.phone,
    location: obj.location,
    bio: obj.bio,
    avatarUrl: obj.avatarUrl,
    status: obj.status,
    emailVerified: obj.emailVerified,
    phoneVerified: obj.phoneVerified,
    profileCompleted: obj.profileCompleted,
    ratingAvg: obj.ratingAvg || 0,
    ratingCount: obj.ratingCount || 0,
    createdAt: obj.createdAt,
  };
}

// Third-party-safe view of a user - omits email/phone (PII that shouldn't be
// visible to just any other logged-in user browsing profiles/listings).
function toPublicUserDTO(user) {
  const obj = user.toObject ? user.toObject() : user;
  return {
    id: obj._id,
    name: obj.name,
    role: obj.role,
    location: obj.location,
    bio: obj.bio,
    avatarUrl: obj.avatarUrl,
    emailVerified: obj.emailVerified,
    ratingAvg: obj.ratingAvg || 0,
    ratingCount: obj.ratingCount || 0,
    createdAt: obj.createdAt,
  };
}

function toContractDTO(contract) {
  const obj = contract.toObject ? contract.toObject() : contract;
  const farmer = obj.farmer || {};
  const buyer = obj.buyer || {};
  const pricePerUnit = obj.agreedPricePerUnit ?? 0;
  return {
    id: obj._id,
    listingId: obj.listing,
    farmerId: farmer._id || obj.farmer,
    farmerName: farmer.name || undefined,
    buyerId: buyer._id || obj.buyer,
    buyerName: buyer.name || undefined,
    cropType: obj.cropType,
    quantity: obj.quantity,
    unit: obj.unit,
    pricePerUnit,
    totalValue: pricePerUnit * (obj.quantity || 0),
    status: obj.status,
    deliveryDate: obj.deliveryDate,
    terms: obj.terms,
    customClauses: obj.customClauses || [],
    signatures: {
      farmer: obj.signatures?.farmer?.signedAt ? obj.signatures.farmer : null,
      buyer: obj.signatures?.buyer?.signedAt ? obj.signatures.buyer : null,
    },
    milestones: (obj.milestones || []).map((m) => ({
      id: m._id,
      label: m.title,
      dueDate: m.dueDate,
      completed: m.status === 'completed',
      completedAt: m.completedAt,
    })),
    startDate: obj.startDate,
    endDate: obj.endDate,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

function toBidDTO(bid) {
  const obj = bid.toObject ? bid.toObject() : bid;
  const proposedBy = obj.proposedBy || {};
  return {
    id: obj._id,
    contractId: obj.contract,
    proposedBy: proposedBy._id || obj.proposedBy,
    proposedByName: proposedBy.name || undefined,
    pricePerUnit: obj.pricePerUnit,
    quantity: obj.quantity,
    message: obj.message,
    status: obj.status,
    createdAt: obj.createdAt,
  };
}

function toTimelineDTO(event) {
  const obj = event.toObject ? event.toObject() : event;
  const actor = obj.actor || {};
  return {
    id: obj._id,
    actorId: actor._id || obj.actor,
    actorName: actor.name || undefined,
    type: obj.type,
    description: obj.detail,
    createdAt: obj.createdAt,
  };
}

function toMessageDTO(message, currentUserId) {
  const obj = message.toObject ? message.toObject() : message;
  const sender = obj.sender || {};
  const readBy = obj.readBy || [];
  return {
    id: obj._id,
    threadId: obj.thread,
    senderId: sender._id || obj.sender,
    senderName: sender.name || undefined,
    type: obj.type,
    body: obj.body,
    attachments: obj.attachments || [],
    // Whether anyone other than the sender has read this message yet -
    // drives the "seen" tick shown on the sender's own sent messages.
    seenByOthers: currentUserId
      ? readBy.some((id) => id.toString() !== currentUserId.toString())
      : readBy.length > 0,
    createdAt: obj.createdAt,
  };
}

function toThreadDTO(thread, currentUserId, unreadCount = 0) {
  const obj = thread.toObject ? thread.toObject() : thread;
  const participants = obj.participants || [];
  const counterpart = participants.find((p) => (p._id || p).toString() !== currentUserId.toString());
  const lastMessageSender = obj.lastMessage?.sender;
  return {
    id: obj._id,
    contractId: obj.contract,
    listingId: obj.listing,
    participants: participants.map((p) => ({ id: p._id || p, name: p.name, role: p.role })),
    counterpartyId: counterpart?._id || counterpart,
    counterpartyName: counterpart?.name || 'Unknown',
    lastMessage: obj.lastMessage?.body
      ? {
          body: obj.lastMessage.body,
          type: obj.lastMessage.type,
          isMine: lastMessageSender ? lastMessageSender.toString() === currentUserId.toString() : false,
        }
      : null,
    lastMessageAt: obj.lastMessageAt,
    unreadCount,
    createdAt: obj.createdAt,
  };
}

function toDisputeDTO(dispute) {
  const obj = dispute.toObject ? dispute.toObject() : dispute;
  const raisedBy = obj.raisedBy || {};
  return {
    id: obj._id,
    contractId: obj.contract,
    raisedById: raisedBy._id || obj.raisedBy,
    raisedByName: raisedBy.name || undefined,
    reason: obj.reason,
    evidenceUrls: obj.evidenceUrls || [],
    status: obj.status,
    resolutionNote: obj.resolutionNote,
    comments: (obj.comments || []).map((c) => ({
      id: c._id,
      authorId: c.author?._id || c.author,
      authorName: c.author?.name || undefined,
      text: c.text,
      createdAt: c.createdAt,
    })),
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

function toReviewDTO(review) {
  const obj = review.toObject ? review.toObject() : review;
  const reviewer = obj.reviewer || {};
  const reviewee = obj.reviewee || {};
  return {
    id: obj._id,
    contractId: obj.contract,
    reviewerId: reviewer._id || obj.reviewer,
    reviewerName: reviewer.name || undefined,
    revieweeId: reviewee._id || obj.reviewee,
    revieweeName: reviewee.name || undefined,
    rating: obj.rating,
    comment: obj.comment,
    response: obj.response,
    createdAt: obj.createdAt,
  };
}

function toPaymentDTO(payment) {
  const obj = payment.toObject ? payment.toObject() : payment;
  const contract = obj.contract || {};
  const payer = obj.payer || {};
  const payee = obj.payee || {};
  return {
    id: obj._id,
    contractId: contract._id || obj.contract,
    cropType: contract.cropType || undefined,
    payerId: payer._id || obj.payer,
    payerName: payer.name || undefined,
    payeeId: payee._id || obj.payee,
    payeeName: payee.name || undefined,
    amount: obj.amount,
    convenienceFee: obj.convenienceFee || 0,
    totalAmount: (obj.amount || 0) + (obj.convenienceFee || 0),
    status: obj.status,
    gateway: obj.gateway,
    method: obj.method,
    orderId: obj.gatewayOrderId,
    transactionId: obj.gatewayPaymentId,
    receiptNumber: obj.receiptNumber,
    failureReason: obj.failureReason,
    paidAt: obj.paidAt,
    releasedAt: obj.releasedAt,
    refundedAt: obj.refundedAt,
    createdAt: obj.createdAt,
  };
}

module.exports = {
  toListingDTO,
  toUserDTO,
  toPublicUserDTO,
  toContractDTO,
  toBidDTO,
  toTimelineDTO,
  toMessageDTO,
  toThreadDTO,
  toDisputeDTO,
  toReviewDTO,
  toPaymentDTO,
};
