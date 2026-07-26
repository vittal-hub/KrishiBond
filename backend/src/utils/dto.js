// Small helpers to map Mongoose docs to plain response DTOs the frontend expects.

function toListingDTO(listing) {
  const obj = listing.toObject ? listing.toObject() : listing;
  const owner = obj.owner || {};
  return {
    id: obj._id,
    cropType: obj.cropType,
    quantity: obj.quantity,
    unit: obj.unit,
    pricePerUnit: obj.pricePerUnit,
    location: obj.location,
    description: obj.description,
    availableFrom: obj.availableFrom,
    status: obj.status,
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
    createdAt: obj.createdAt,
  };
}

module.exports = { toListingDTO, toUserDTO };
