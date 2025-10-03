const express = require('express');
const router = express.Router();
const adSalesAdSpendController = require('../controllers/adsalesadspend.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

router.get('/', authenticateToken, adSalesAdSpendController.getAdSalesAdSpendByDatabase);

module.exports = router;
