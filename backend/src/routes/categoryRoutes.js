const express = require('express');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/role');
const { createCategorySchema, updateCategorySchema } = require('../validators/categoryValidators');
const ctrl = require('../controllers/categoryController');

const router = express.Router();

router.get('/', ctrl.listCategories);
router.post('/', protect, restrictTo('admin'), validate(createCategorySchema), ctrl.createCategory);
router.patch('/:id', protect, restrictTo('admin'), validate(updateCategorySchema), ctrl.updateCategory);
router.delete('/:id', protect, restrictTo('admin'), ctrl.deleteCategory);

module.exports = router;
