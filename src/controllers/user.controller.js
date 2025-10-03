const userService = require('../services/user.service');
const orderService = require('../services/order.service');
const logger = require('../utils/logger');

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const result = await userService.login(email, password);

    logger.info(`User logged in: ${email}`);
    res.status(200).json(result);
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    res.status(401).json({
      success: false,
      message: error.message,
    });
  }
};

const signup = async (req, res) => {
  try {
    const { name, email, password, phone, role, clientId } = req.body;

    if (!name || !email || !password || !phone || !role || !clientId) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: name, email, password, phone, role, clientId',
      });
    }

    const result = await userService.signup({ name, email, password, phone, role, clientId });

    logger.info(`User registered: ${email}`);
    res.status(201).json(result);
  } catch (error) {
    logger.error(`Signup error: ${error.message}`);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const getUserDetails = async (req, res) => {
  try {
    const userId = req.user.userId; // Extracted from JWT token by middleware
    const userDetails = await userService.getUserById(userId);

    logger.info(`User details fetched for userId: ${userId}`);
    res.status(200).json({
      success: true,
      message: 'User details retrieved successfully',
      data: userDetails,
    });
  } catch (error) {
    logger.error(`Get user details error: ${error.message}`);
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

const getClientData = async (req, res) => {
  try {
    const clientId = req.user.client_id; // Extracted from JWT token
    const clientData = await userService.getClientByClientId(clientId);

    logger.info(`Client data fetched for clientId: ${clientId}`);
    res.status(200).json({
      success: true,
      message: 'Client data retrieved successfully',
      data: clientData,
    });
  } catch (error) {
    logger.error(`Get client data error: ${error.message}`);
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

const getOrdersData = async (req, res) => {
  try {
    // The orderService.getOrdersByDatabase handles the request and response directly
    await orderService.getOrdersByDatabase(req, res);
  } catch (error) {
    logger.error(`Get orders data error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  login,
  signup,
  getUserDetails,
  getClientData,
  getOrdersData,
};
