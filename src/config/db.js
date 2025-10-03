const sql = require('mssql');
require('dotenv').config();

// Database configuration for Azure SQL
const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

let pool;

// Function to connect to the database with retry logic
const connectDB = async () => {
  let retries = 3;
  while (retries > 0) {
    try {
      pool = await sql.connect(config);
      console.log('✅ Connected to Azure SQL database');
      return pool;
    } catch (err) {
      console.error('❌ Database connection failed', err);
      retries--;
      if (retries > 0) {
        console.log(`Retrying connection... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      }
    }
  }
  console.error('❌ Failed to connect to database after retries');
  process.exit(1);
};

module.exports = { connectDB, getPool: () => pool };
