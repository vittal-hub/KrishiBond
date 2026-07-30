const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Category = require('../models/Category');
const { recordAudit } = require('../utils/auditLog');
const { escapeRegex } = require('../utils/regex');

const listCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true }).sort('name');
  res.json({ success: true, categories });
});

const createCategory = asyncHandler(async (req, res) => {
  const existing = await Category.findOne({ name: new RegExp(`^${escapeRegex(req.body.name)}$`, 'i') });
  if (existing) throw new ApiError(409, 'A category with this name already exists');

  const category = await Category.create({ ...req.body, createdBy: req.user._id });
  await recordAudit(req, { action: 'CATEGORY_CREATE', entityType: 'Category', entityId: category._id, after: category.toObject() });
  res.status(201).json({ success: true, category });
});

const updateCategory = asyncHandler(async (req, res) => {
  const before = await Category.findById(req.params.id);
  if (!before) throw new ApiError(404, 'Category not found');
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  await recordAudit(req, {
    action: 'CATEGORY_UPDATE',
    entityType: 'Category',
    entityId: category._id,
    before: before.toObject(),
    after: category.toObject(),
  });
  res.json({ success: true, category });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');
  await recordAudit(req, { action: 'CATEGORY_DELETE', entityType: 'Category', entityId: category._id, before: category.toObject() });
  res.json({ success: true, message: 'Category deleted' });
});

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };
