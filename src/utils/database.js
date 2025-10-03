const { getPool } = require('../config/db');

/**
 * Gets the Azure SQL connection pool
 * @returns {sql.ConnectionPool} SQL connection pool
 */
const getConnection = () => {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database connection not established');
  }
  return pool;
};

module.exports = {
  getConnection,
};
