const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

// Route for getting inventory by database
router.get('/', authenticateToken, inventoryController.getInventoryByDatabase);

// New route for inventory dropdown data (skuList, categoryList, productNameList)
router.get('/dropdown-data', authenticateToken, inventoryController.getInventoryDropdownData);

// New route for inventory overstock data
router.get('/overstock-data', authenticateToken, inventoryController.getInventoryOverstockData);

// New route for inventory understock data
router.get('/understock-data', authenticateToken, inventoryController.getInventoryUnderstockData);

// New route for active SKU out of stock data
router.get('/activeSKUoutofstock-data', authenticateToken, inventoryController.getInventoryActiveSKUOutOfStockData);

// New route for inventory count summary
router.get('/count-summary', authenticateToken, inventoryController.getInventoryCountSummary);

// New route for stock status counts
router.get('/stock-status-counts', authenticateToken, inventoryController.getInventoryStockStatusCounts);

// New route for inventory executive data
router.get('/executive-data', authenticateToken, inventoryController.getInventoryExecutiveData);

module.exports = router;
