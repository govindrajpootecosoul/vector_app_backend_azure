const sql = require('mssql');
const { getConnection } = require('../utils/database');

exports.getInventoryExecutiveData = async (req, res) => {
  try {
    const { country, platform } = req.query;
    const clientId = req.user.client_id; // Get client_id from JWT token

    const pool = await getConnection();

    // Build WHERE clause
    let whereClause = 'client_id = @clientId';
    const request = pool.request();
    request.input('clientId', sql.VarChar, clientId);

    if (country) {
      whereClause += ' AND country LIKE @country';
      request.input('country', sql.VarChar, `%${country}%`);
    }
    if (platform) {
      whereClause += ' AND platform LIKE @platform';
      request.input('platform', sql.VarChar, `%${platform}%`);
    }

    const query = `
      SELECT
        MAX(platform) as platform,
        SUM(estimated_storage_cost_next_month) as estimated_storage_cost_next_month,
        AVG(dos_2) as DOS_2,
        SUM(afn_warehouse_quantity) as afn_warehouse_quantity,
        SUM(afn_fulfillable_quantity) as afn_fulfillable_quantity,
        SUM(afn_unsellable_quantity) as afn_unsellable_quantity,
        SUM(fc_transfer) as fctransfer,
        SUM(customer_reserved) as customer_reserved,
        SUM(fc_processing) as fc_processing,
        SUM(inv_age_0_to_30_days + inv_age_31_to_60_days + inv_age_61_to_90_days) as inv_age_0_to_90_days,
        SUM(inv_age_91_to_180_days + inv_age_181_to_270_days) as inv_age_91_to_270_days,
        AVG(CASE WHEN instock_rate_percent != 0 THEN instock_rate_percent END) as instock_rate_percent,
        SUM(CASE WHEN stock_status = 'Understock' AND dos_2 = 0 THEN 1 ELSE 0 END) as active_sku_out_of_stock_count,
        SUM(sale_lost) as sale_lost
      FROM std_inventory
      WHERE ${whereClause}
    `;

    const result = await request.query(query);
    const data = result.recordset[0] || {};

    // Calculate estimated_storage_cost_previous_month based on platform
    let estimated_storage_cost_previous_month = 0;
    if (data.platform === 'amazon') {
      estimated_storage_cost_previous_month = 2440;
    } else if (data.platform === 'shopify') {
      estimated_storage_cost_previous_month = 3078;
    }

    const inventoryExecutiveData = {
      ...data,
      estimated_storage_cost_previous_month
    };

    res.json({
      success: true,
      message: 'Inventory Executive data retrieved successfully',
      data: inventoryExecutiveData
    });

  } catch (error) {
    console.error('Inventory Executive service error:', error);
    res.status(500).json({ error: error.message });
  }
};
