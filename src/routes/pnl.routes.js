const express = require('express');
const router = express.Router();
const pnlController = require('../controllers/pnl.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

router.get('/:databaseName/pnl-data', authenticateToken, pnlController.getPnlData);
router.get('/:databaseName/pnlexecutive', authenticateToken, pnlController.getPnlExecutiveData);
router.get('/:databaseName/pnldropdown', authenticateToken, pnlController.getPnlDropdownData);

module.exports = router;
