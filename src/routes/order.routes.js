const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

// Route for getting order list
router.get('/orderlist', authenticateToken, orderController.getOrderListByDatabase);

// New route for dropdown data
router.get('/dropdown-data', authenticateToken, orderController.getDropdownData);

module.exports = router;
