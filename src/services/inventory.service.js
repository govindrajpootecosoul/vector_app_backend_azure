const { getConnection } = require('../utils/database');
const sql = require('mssql');

exports.getInventoryByDatabase = async (req, res) => {
  try {
    const { sku, category, product, country, platform } = req.query;
    const clientId = req.user.client_id; // Get client_id from JWT token

    const pool = await getConnection();
    let query = 'SELECT * FROM std_inventory WHERE client_id = @clientId';
    const request = pool.request();
    request.input('clientId', sql.VarChar, clientId);

    // Build filter based on query params
    if (sku) {
      query += ' AND sku = @sku';
      request.input('sku', sql.VarChar, sku);
    }
    if (category) {
      query += ' AND product_category = @category';
      request.input('category', sql.VarChar, category);
    }
    if (product) {
      query += ' AND product_name = @product';
      request.input('product', sql.VarChar, product);
    }
    if (country) {
      query += ' AND country = @country';
      request.input('country', sql.VarChar, country);
    }
    if (platform) {
      query += ' AND platform = @platform';
      request.input('platform', sql.VarChar, platform);
    }

    const result = await request.query(query);
    const inventoryData = result.recordset;

    console.log('Total inventory items found:', inventoryData.length);

    // Calculate totals
    let totalQuantity = 0;
    let totalValue = 0;
    let totalItems = inventoryData.length;

    inventoryData.forEach(item => {
      totalQuantity += Number(item.quantity) || 0;
      totalValue += Number(item.total_value || item.value) || 0;
    });

    // Return filtered inventory data
    res.json({
      success: true,
      message: 'Inventory data retrieved successfully',
      data: {
        totalItems,
        inventoryData
      }
    });

  } catch (error) {
    console.error('Inventory service error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getInventoryDropdownData = async (req, res) => {
  try {
    const { platform, country } = req.query;
    const clientId = req.user.client_id; // Get client_id from JWT token

    const pool = await getConnection();

    let skuQuery = 'SELECT DISTINCT sku FROM std_inventory WHERE client_id = @clientId AND sku IS NOT NULL';
    let categoryQuery = 'SELECT DISTINCT product_category FROM std_inventory WHERE client_id = @clientId AND product_category IS NOT NULL';
    let productQuery = 'SELECT DISTINCT product_name FROM std_inventory WHERE client_id = @clientId AND product_name IS NOT NULL';

    const request = pool.request();
    request.input('clientId', sql.VarChar, clientId);

    // Add filters for platform and country if provided
    if (platform) {
      skuQuery += ' AND platform LIKE @platform';
      categoryQuery += ' AND platform LIKE @platform';
      productQuery += ' AND platform LIKE @platform';
      request.input('platform', sql.VarChar, `%${platform}%`);
    }
    if (country) {
      skuQuery += ' AND country LIKE @country';
      categoryQuery += ' AND country LIKE @country';
      productQuery += ' AND country LIKE @country';
      request.input('country', sql.VarChar, `%${country}%`);
    }

    const skuRequest = pool.request();
    skuRequest.input('clientId', sql.VarChar, clientId);
    if (platform) skuRequest.input('platform', sql.VarChar, `%${platform}%`);
    if (country) skuRequest.input('country', sql.VarChar, `%${country}%`);

    const categoryRequest = pool.request();
    categoryRequest.input('clientId', sql.VarChar, clientId);
    if (platform) categoryRequest.input('platform', sql.VarChar, `%${platform}%`);
    if (country) categoryRequest.input('country', sql.VarChar, `%${country}%`);

    const productRequest = pool.request();
    productRequest.input('clientId', sql.VarChar, clientId);
    if (platform) productRequest.input('platform', sql.VarChar, `%${platform}%`);
    if (country) productRequest.input('country', sql.VarChar, `%${country}%`);

    const [skuResult, categoryResult, productResult] = await Promise.all([
      skuRequest.query(skuQuery),
      categoryRequest.query(categoryQuery),
      productRequest.query(productQuery)
    ]);

    const skuList = skuResult.recordset.map(row => row.sku).filter(sku => sku);
    const categoryList = categoryResult.recordset.map(row => row.product_category).filter(category => category);
    const productNameList = productResult.recordset.map(row => row.product_name).filter(product => product);

    res.json({
      success: true,
      message: 'Inventory dropdown data retrieved successfully',
      data: {
        skuList,
        categoryList,
        productNameList
      }
    });

  } catch (error) {
    console.error('Inventory dropdown service error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getInventoryOverstockData = async (req, res) => {
  try {
    const { country, platform } = req.query;
    const clientId = req.user.client_id; // Get client_id from JWT token

    const pool = await getConnection();
    let query = 'SELECT * FROM std_inventory WHERE client_id = @clientId AND stock_status = @stockStatus AND dos_2 >= @dos2 AND afn_fulfillable_quantity>=@afn_fulfillable_quantity';
    const request = pool.request();
    request.input('clientId', sql.VarChar, clientId);
    request.input('stockStatus', sql.VarChar, 'Overstock');
    request.input('dos2', sql.Int, 90);
    request.input('afn_fulfillable_quantity', sql.Int, 90);

    // Add filters for platform and country if provided
    if (platform) {
      query += ' AND platform LIKE @platform';
      request.input('platform', sql.VarChar, `%${platform}%`);
    }
    if (country) {
      query += ' AND country LIKE @country';
      request.input('country', sql.VarChar, `%${country}%`);
    }

    const result = await request.query(query);
    const inventoryData = result.recordset;

    console.log('Total overstock inventory items found:', inventoryData.length);

    res.json({
      success: true,
      message: 'Inventory overstock data retrieved successfully',
      data: { inventoryData }
    });

  } catch (error) {
    console.error('Inventory overstock service error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getInventoryUnderstockData = async (req, res) => {
  try {
    const { country, platform } = req.query;
    const clientId = req.user.client_id; // Get client_id from JWT token

    const pool = await getConnection();
    let query = 'SELECT * FROM std_inventory WHERE client_id = @clientId AND stock_status = @stockStatus AND dos_2 <= @dos2 AND afn_fulfillable_quantity<=@afn_fulfillable_quantity ';
    const request = pool.request();
    request.input('clientId', sql.VarChar, clientId);
    request.input('stockStatus', sql.VarChar, 'Understock');
    request.input('dos2', sql.Int, 30);
    request.input('afn_fulfillable_quantity', sql.Int, 30);

    // Add filters for platform and country if provided
    if (platform) {
      query += ' AND platform LIKE @platform';
      request.input('platform', sql.VarChar, `%${platform}%`);
    }
    if (country) {
      query += ' AND country LIKE @country';
      request.input('country', sql.VarChar, `%${country}%`);
    }

    const result = await request.query(query);
    const inventoryData = result.recordset;

    console.log('Total understock inventory items found:', inventoryData.length);

    res.json({
      success: true,
      message: 'Inventory understock data retrieved successfully',
      data: { inventoryData }
    });

  } catch (error) {
    console.error('Inventory understock service error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getInventoryActiveSKUOutOfStockData = async (req, res) => {
  try {
    const { country, platform } = req.query;
    const clientId = req.user.client_id; // Get client_id from JWT token

    const pool = await getConnection();
    let query = 'SELECT * FROM std_inventory WHERE client_id = @clientId AND stock_status = @stockStatus AND dos_2 = @dos2 AND afn_fulfillable_quantity=@afn_fulfillable_quantity';
    const request = pool.request();
    request.input('clientId', sql.VarChar, clientId);
    request.input('stockStatus', sql.VarChar, 'Understock');
    request.input('dos2', sql.Int, 0);
    request.input('afn_fulfillable_quantity', sql.Int, 0);

    // Add filters for platform and country if provided
    if (platform) {
      query += ' AND platform LIKE @platform';
      request.input('platform', sql.VarChar, `%${platform}%`);
    }
    if (country) {
      query += ' AND country LIKE @country';
      request.input('country', sql.VarChar, `%${country}%`);
    }

    const result = await request.query(query);
    const inventoryData = result.recordset;

    console.log('Total activeSKUoutofstock inventory items found:', inventoryData.length);

    res.json({
      success: true,
      message: 'Inventory activeSKUoutofstock data retrieved successfully',
      data: { inventoryData }
    });

  } catch (error) {
    console.error('Inventory activeSKUoutofstock service error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getInventoryCountSummary = async (req, res) => {
  try {
    const clientId = req.user.client_id; // Get client_id from JWT token

    const pool = await getConnection();
    const query = `
      SELECT country, platform, COUNT(*) as count
      FROM std_inventory
      WHERE client_id = @clientId
      GROUP BY country, platform
    `;
    const request = pool.request();
    request.input('clientId', sql.VarChar, clientId);

    const result = await request.query(query);
    const countSummary = result.recordset;

    console.log('Inventory count summary:', countSummary.length);

    res.json({
      success: true,
      message: 'Inventory count summary retrieved successfully',
      data: countSummary
    });

  } catch (error) {
    console.error('Inventory count summary service error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getInventoryStockStatusCounts = async (req, res) => {
  try {
    const { country, platform } = req.query;
    const clientId = req.user.client_id; // Get client_id from JWT token

    const pool = await getConnection();

    // Build base WHERE clause
    let baseWhere = 'client_id = @clientId';
    const request = pool.request();
    request.input('clientId', sql.VarChar, clientId);

    if (platform) {
      baseWhere += ' AND platform LIKE @platform';
      request.input('platform', sql.VarChar, `%${platform}%`);
    }
    if (country) {
      baseWhere += ' AND country LIKE @country';
      request.input('country', sql.VarChar, `%${country}%`);
    }

    // Count overstock: stock_status: "Overstock", dos_2: >= 90
    const overstockQuery = `SELECT COUNT(*) as count FROM std_inventory WHERE ${baseWhere} AND stock_status = 'Overstock' AND dos_2 >= 90 AND afn_fulfillable_quantity >= 90`;
    const overstockRequest = pool.request();
    overstockRequest.input('clientId', sql.VarChar, clientId);
    if (platform) overstockRequest.input('platform', sql.VarChar, `%${platform}%`);
    if (country) overstockRequest.input('country', sql.VarChar, `%${country}%`);
    const overstockResult = await overstockRequest.query(overstockQuery);
    const overstockCount = overstockResult.recordset[0].count;

    // Count understock: stock_status: "Understock", dos_2: <= 30
    const understockQuery = `SELECT COUNT(*) as count FROM std_inventory WHERE ${baseWhere} AND stock_status = 'Understock' AND dos_2 <= 30 AND afn_fulfillable_quantity <= 30`;
    const understockRequest = pool.request();
    understockRequest.input('clientId', sql.VarChar, clientId);
    if (platform) understockRequest.input('platform', sql.VarChar, `%${platform}%`);
    if (country) understockRequest.input('country', sql.VarChar, `%${country}%`);
    const understockResult = await understockRequest.query(understockQuery);
    const understockCount = understockResult.recordset[0].count;

    // Count active SKU out of stock: stock_status: "Understock", dos_2: 0
    const activeSKUOutOfStockQuery = `SELECT COUNT(*) as count FROM std_inventory WHERE ${baseWhere} AND stock_status = 'Understock' AND dos_2 = 0 AND afn_fulfillable_quantity = 0`;
    const activeSKUOutOfStockRequest = pool.request();
    activeSKUOutOfStockRequest.input('clientId', sql.VarChar, clientId);
    if (platform) activeSKUOutOfStockRequest.input('platform', sql.VarChar, `%${platform}%`);
    if (country) activeSKUOutOfStockRequest.input('country', sql.VarChar, `%${country}%`);
    const activeSKUOutOfStockResult = await activeSKUOutOfStockRequest.query(activeSKUOutOfStockQuery);
    const activeSKUOutOfStockCount = activeSKUOutOfStockResult.recordset[0].count;

    // Get average instock rate percent, excluding 0 values
    const instockRateQuery = `SELECT AVG(instock_rate_percent) as instock_rate_percent FROM std_inventory WHERE ${baseWhere} AND instock_rate_percent IS NOT NULL AND instock_rate_percent != 0`;
    const instockRateRequest = pool.request();
    instockRateRequest.input('clientId', sql.VarChar, clientId);
    if (platform) instockRateRequest.input('platform', sql.VarChar, `%${platform}%`);
    if (country) instockRateRequest.input('country', sql.VarChar, `%${country}%`);
    const instockRateResult = await instockRateRequest.query(instockRateQuery);
    const instockRatePercent = instockRateResult.recordset[0].instock_rate_percent || 0;

    console.log('Stock status counts:', { overstockCount, understockCount, activeSKUOutOfStockCount, instockRatePercent });

    res.json({
      success: true,
      message: 'Inventory stock status counts retrieved successfully',
      data: {
        overstockCount,
        understockCount,
        activeSKUOutOfStockCount,
        instock_rate_percent: instockRatePercent
      }
    });

  } catch (error) {
    console.error('Inventory stock status counts service error:', error);
    res.status(500).json({ error: error.message });
  }
};
