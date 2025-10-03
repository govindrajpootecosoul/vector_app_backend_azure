 const sql = require('mssql');
const { getConnection } = require('../utils/database');
const moment = require('moment');

exports.getPnlData = async (req, res) => {
  try {
    const {
      sku,
      category,
      productName,
      country,
      platform,
      date,
      range,
      startMonth,
      endMonth,
      cm3Type,
      sortOrder
    } = req.query;
    const clientId = req.user.client_id; // Get client_id from JWT token

    if (!range && !date && !startMonth && !endMonth) {
      return res.status(400).json({
        status: 400,
        message: "Provide a valid range parameter (currentmonths, lastmonth, yeartodate, lastyear) or date/startMonth-endMonth parameters.",
        success: false,
        data: {
          code: "BAD_REQUEST",
          message: "range, date, startMonth, or endMonth is required",
          details: "Provide a valid range parameter (currentmonths, lastmonth, yeartodate, lastyear) or date/startMonth-endMonth parameters."
        },
        timestamp: new Date().toISOString()
      });
    }

    const pool = await getConnection();

    // Build WHERE clause
    let whereClause = 'client_id = @clientId';
    const request = pool.request();
    request.input('clientId', sql.VarChar, clientId);

    // Basic filters
    if (sku) {
      whereClause += ' AND sku = @sku';
      request.input('sku', sql.VarChar, sku);
    }
    if (category) {
      whereClause += ' AND product_category = @category';
      request.input('category', sql.VarChar, category);
    }
    if (productName) {
      whereClause += ' AND product_name = @productName';
      request.input('productName', sql.VarChar, productName);
    }
    if (country) {
      whereClause += ' AND country = @country';
      request.input('country', sql.VarChar, country);
    }
    if (platform) {
      whereClause += ' AND platform = @platform';
      request.input('platform', sql.VarChar, platform);
    }

    // Date range filters
    const yearMonthFilter = [];
    const now = moment();

    if (date) {
      // Specific date (YYYY-MM)
      yearMonthFilter.push(date);
    } else if (range) {
      switch (range) {
        case 'currentmonth':
          yearMonthFilter.push(now.format('YYYY-MM'));
          break;
        case 'previousmonth':
          yearMonthFilter.push(now.subtract(1, 'month').format('YYYY-MM'));
          break;
        case 'currentyear':
          const currentYear = now.year();
          const currentMonth = now.month() + 1; // moment months are 0-based
          for (let month = 1; month <= currentMonth; month++) {
            yearMonthFilter.push(`${currentYear}-${month.toString().padStart(2, '0')}`);
          }
          break;
        case 'lastyear':
          const lastyear = now.year() - 1;
          for (let month = 1; month <= 12; month++) {
            yearMonthFilter.push(`${lastyear}-${month.toString().padStart(2, '0')}`);
          }
          break;
        default:
          return res.status(400).json({
            status: 400,
             message: "Provide a valid range parameter such as currentmonths, lastmonth, yeartodate, or lastyear.",
             success: false,
            data: {
              code: "BAD_REQUEST",
              message: `Invalid range: ${range}`,
              details: "Provide a valid range parameter such as currentmonths, lastmonth, yeartodate, or lastyear."
            },
            timestamp: new Date().toISOString()
          });
      }
    } else if (startMonth && endMonth) {
      // Custom range
      const start = moment(startMonth, 'YYYY-MM');
      const end = moment(endMonth, 'YYYY-MM');
      let current = start.clone();
      while (current.isSameOrBefore(end)) {
        yearMonthFilter.push(current.format('YYYY-MM'));
        current.add(1, 'month');
      }
    }

    if (yearMonthFilter.length > 0) {
      const placeholders = yearMonthFilter.map((_, i) => `@yearMonth${i}`).join(',');
      whereClause += ` AND year_month IN (${placeholders})`;
      yearMonthFilter.forEach((ym, i) => request.input(`yearMonth${i}`, sql.VarChar, ym));
    }

    // CM3 type filter
    if (cm3Type) {
      switch (cm3Type) {
        case 'gainer':
          whereClause += ' AND cm3 >= 0';
          break;
        case 'drainer':
          whereClause += ' AND cm3 < 0';
          break;
        case 'all':
          // No filter
          break;
      }
    }

    // Build ORDER BY clause
    let orderBy = '';
    if (sortOrder) {
      switch (sortOrder) {
        case 'ascending':
          orderBy = 'ORDER BY cm3 ASC';
          break;
        case 'descending':
          orderBy = 'ORDER BY cm3 DESC';
          break;
      }
    }

    console.log('PNL WHERE clause:', whereClause);
    console.log('PNL ORDER BY:', orderBy);

    // SQL query to group by sku and sum data
    const query = `
      SELECT
        sku,
        MAX(product_name) as product_name,
        MAX(product_category) as product_category,
        MAX(country) as country,
        MAX(platform) as platform,
        MAX(year_month) as year_month,
        SUM(ad_cost) as ad_cost,
        SUM(deal_fee) as deal_fee,
        SUM(fba_inventory_fee) as fba_inventory_fee,
        SUM(fba_reimbursement) as fba_reimbursement,
        SUM(liquidations) as liquidations,
        SUM(net_sales) as net_sales,
        SUM(net_sales_with_tax) as net_sales_with_tax,
        SUM(other_marketing_expenses) as other_marketing_expenses,
        SUM(storage_fee) as storage_fee,
        SUM(total_return_with_tax) as total_return_with_tax,
        SUM(total_sales) as total_sales,
        SUM(total_sales_with_tax) as total_sales_with_tax,
        SUM(total_units) as total_units,
        SUM(total_return_amount) as total_return_amount,
        SUM(fba_fees) as fba_fees,
        SUM(promotional_rebates) as promotional_rebates,
        SUM(quantity) as quantity,
        SUM(refund_quantity) as refund_quantity,
        SUM(selling_fees) as selling_fees,
        SUM(spend) as spend,
        SUM(product_cogs) as product_cogs,
        SUM(cogs) as cogs,
        SUM(cm1) as cm1,
        SUM(heads_cm2) as heads_cm2,
        SUM(cm2) as cm2,
        SUM(heads_cm3) as heads_cm3,
        SUM(cm3) as cm3
      FROM std_pnl
      WHERE ${whereClause}
      GROUP BY sku
      ${orderBy}
    `;

    const result = await request.query(query);
    const pnlData = result.recordset;

    console.log('Total PNL records found:', pnlData.length);

    res.json({
      success: true,
      message: 'PNL data retrieved successfully',
      data: { pnlData }
    });

  } catch (error) {
    console.error('PNL service error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getPnlExecutiveData = async (req, res) => {
  try {
    const { databaseName } = req.params;
    const {
      sku,
      category,
      productName,
      country,
      platform,
      date,
      range,
      startMonth,
      endMonth,
      cm3Type
    } = req.query;

    const clientId = req.user.client_id;

    if (!range && !date && !startMonth && !endMonth) {
      return res.status(400).json({
        status: 400,
        message: "Provide a valid range parameter (currentmonth, previousmonth, currentyear, lastyear) or date/startMonth-endMonth parameters.",
        success: false,
        data: {
          code: "BAD_REQUEST",
          message: "range, date, startMonth, or endMonth is required",
          details: "Provide a valid range parameter (currentmonth, previousmonth, currentyear, lastyear) or date/startMonth-endMonth parameters."
        },
        timestamp: new Date().toISOString()
      });
    }

    const pool = await getConnection();

    // Date range filters
    const yearMonthFilter = [];
    const now = moment();

    // Calculate current and previous period filters
    let currentPeriodFilter = [];
    let previousPeriodFilter = [];
    let currentPeriodLabel = '';
    let previousPeriodLabel = '';

    if (date) {
      // Specific date (YYYY-MM)
      currentPeriodFilter.push(date);
      currentPeriodLabel = date;
      // Previous month from specific date
      const dateMoment = moment(date, 'YYYY-MM');
      previousPeriodFilter.push(dateMoment.clone().subtract(1, 'month').format('YYYY-MM'));
      previousPeriodLabel = dateMoment.clone().subtract(1, 'month').format('YYYY-MM');
    } else if (range) {
      switch (range) {
        case 'currentmonth':
          const currentMonthStr = now.format('YYYY-MM');
          const previousMonthStr = now.clone().subtract(1, 'month').format('YYYY-MM');
          currentPeriodFilter.push(currentMonthStr);
          previousPeriodFilter.push(previousMonthStr);
          currentPeriodLabel = currentMonthStr;
          previousPeriodLabel = previousMonthStr;
          break;
        case 'previousmonth':
          const prevMonthStr = now.clone().subtract(1, 'month').format('YYYY-MM');
          const prevPrevMonthStr = now.clone().subtract(2, 'month').format('YYYY-MM');
          currentPeriodFilter.push(prevMonthStr);
          previousPeriodFilter.push(prevPrevMonthStr);
          currentPeriodLabel = prevMonthStr;
          previousPeriodLabel = prevPrevMonthStr;
          break;
        case 'currentyear':
          const currentYear = now.year();
          const currentMonth = now.month() + 1;
          for (let month = 1; month <= currentMonth; month++) {
            currentPeriodFilter.push(`${currentYear}-${month.toString().padStart(2, '0')}`);
          }
          currentPeriodLabel = `Current Year (${currentYear})`;
          // Previous year
          const prevYear = currentYear - 1;
          previousPeriodFilter = [];
          for (let month = 1; month <= 12; month++) {
            previousPeriodFilter.push(`${prevYear}-${month.toString().padStart(2, '0')}`);
          }
          previousPeriodLabel = `Previous Year (${prevYear})`;
          break;
        case 'lastyear':
          const lastyear = now.year() - 1;
          for (let month = 1; month <= 12; month++) {
            currentPeriodFilter.push(`${lastyear}-${month.toString().padStart(2, '0')}`);
          }
          currentPeriodLabel = `Last Year (${lastyear})`;
          // Previous year (year before last year)
          const prevLastYear = lastyear - 1;
          previousPeriodFilter = [];
          for (let month = 1; month <= 12; month++) {
            previousPeriodFilter.push(`${prevLastYear}-${month.toString().padStart(2, '0')}`);
          }
          previousPeriodLabel = `Previous Year (${prevLastYear})`;
          break;
        default:
          return res.status(400).json({
            status: 400,
            message: "Provide a valid range parameter such as currentmonth, previousmonth, currentyear, or lastyear.",
            success: false,
            data: {
              code: "BAD_REQUEST",
              message: `Invalid range: ${range}`,
              details: "Provide a valid range parameter such as currentmonth, previousmonth, currentyear, or lastyear."
            },
            timestamp: new Date().toISOString()
          });
      }
    } else if (startMonth && endMonth) {
      // Custom range
      const start = moment(startMonth, 'YYYY-MM');
      const end = moment(endMonth, 'YYYY-MM');
      let current = start.clone();
      while (current.isSameOrBefore(end)) {
        currentPeriodFilter.push(current.format('YYYY-MM'));
        current.add(1, 'month');
      }

      currentPeriodLabel = `${startMonth} to ${endMonth}`;

      // Calculate previous period (same duration before start date)
      const duration = end.diff(start, 'months') + 1;
      const prevStart = start.clone().subtract(duration, 'months');
      const prevEnd = start.clone().subtract(1, 'months');

      let prevCurrent = prevStart.clone();
      while (prevCurrent.isSameOrBefore(prevEnd)) {
        previousPeriodFilter.push(prevCurrent.format('YYYY-MM'));
        prevCurrent.add(1, 'month');
      }

      previousPeriodLabel = `${prevStart.format('YYYY-MM')} to ${prevEnd.format('YYYY-MM')}`;
    }

    // Helper function to build WHERE clause and execute query
    const executePnlQuery = async (periodFilter, periodLabel) => {
      let whereClause = 'client_id = @clientId';
      const request = pool.request();
      request.input('clientId', sql.VarChar, clientId);

      // Basic filters
      if (sku) {
        whereClause += ' AND sku = @sku';
        request.input('sku', sql.VarChar, sku);
      }
      if (category) {
        whereClause += ' AND product_category = @category';
        request.input('category', sql.VarChar, category);
      }
      if (productName) {
        whereClause += ' AND product_name = @productName';
        request.input('productName', sql.VarChar, productName);
      }
      if (country) {
        whereClause += ' AND country = @country';
        request.input('country', sql.VarChar, country);
      }
      if (platform) {
        whereClause += ' AND platform = @platform';
        request.input('platform', sql.VarChar, platform);
      }

      // Add period year_month filters
      if (periodFilter.length > 0) {
        const placeholders = periodFilter.map((_, i) => `@yearMonth${i}`).join(',');
        whereClause += ` AND year_month IN (${placeholders})`;
        periodFilter.forEach((ym, i) => request.input(`yearMonth${i}`, sql.VarChar, ym));
      }

      // CM3 type filter
      if (cm3Type) {
        switch (cm3Type) {
          case 'gainer':
            whereClause += ' AND cm3 >= 0';
            break;
          case 'drainer':
            whereClause += ' AND cm3 < 0';
            break;
          case 'all':
            // No filter
            break;
        }
      }

      const query = `
        SELECT
          SUM(ad_cost) as ad_cost,
          SUM(deal_fee) as deal_fee,
          SUM(fba_inventory_fee) as fba_inventory_fee,
          SUM(fba_reimbursement) as fba_reimbursement,
          SUM(liquidations) as liquidations,
          SUM(net_sales) as net_sales,
          SUM(net_sales_with_tax) as net_sales_with_tax,
          SUM(other_marketing_expenses) as other_marketing_expenses,
          SUM(storage_fee) as storage_fee,
          SUM(total_return_with_tax) as total_return_with_tax,
          SUM(total_sales) as total_sales,
          SUM(total_sales_with_tax) as total_sales_with_tax,
          SUM(total_units) as total_units,
          SUM(total_return_amount) as total_return_amount,
          SUM(fba_fees) as fba_fees,
          SUM(promotional_rebates) as promotional_rebates,
          SUM(quantity) as quantity,
          SUM(refund_quantity) as refund_quantity,
          SUM(selling_fees) as selling_fees,
          SUM(spend) as spend,
          SUM(product_cogs) as product_cogs,
          SUM(cogs) as cogs,
          SUM(cm1) as cm1,
          SUM(heads_cm2) as heads_cm2,
          SUM(cm2) as cm2,
          SUM(heads_cm3) as heads_cm3,
          SUM(cm3) as cm3
        FROM std_pnl
        WHERE ${whereClause}
      `;

      const result = await request.query(query);
      return result.recordset[0] || {};
    };

    let currentPeriodData = null;
    let previousPeriodData = null;
    let comparison = null;

    // Get current period data
    currentPeriodData = await executePnlQuery(currentPeriodFilter, currentPeriodLabel);

    // Always get previous period data for comparison
    if (previousPeriodFilter.length > 0) {
      previousPeriodData = await executePnlQuery(previousPeriodFilter, previousPeriodLabel);

      // Calculate comparison metrics
      const calculatePercentChange = (current, previous) => {
        if (!previous || previous === 0) return "N/A";
        const diff = ((current - previous) / previous) * 100;
        return diff.toFixed(2);
      };

      comparison = {
        cm1_change: calculatePercentChange(currentPeriodData.cm1, previousPeriodData.cm1),
        cm2_change: calculatePercentChange(currentPeriodData.cm2, previousPeriodData.cm2),
        cm3_change: calculatePercentChange(currentPeriodData.cm3, previousPeriodData.cm3)
      };
    }

    const response = {
      success: true,
      message: 'PNL Executive data retrieved successfully',
      data: {
        currentPeriod: currentPeriodData,
        ...(previousPeriodData && {
          previousPeriod: previousPeriodData,
          comparison: comparison
        })
      }
    };

    res.json(response);

  } catch (error) {
    console.error('PNL Executive service error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getPnlDropdownData = async (req, res) => {
  try {
    const clientId = req.user.client_id;
    const { country, platform } = req.query;

    const pool = await getConnection();

    // Build WHERE clause
    let whereClause = 'client_id = @clientId';
    const request = pool.request();
    request.input('clientId', sql.VarChar, clientId);

    if (country && country.trim() !== '') {
      whereClause += ' AND country = @country';
      request.input('country', sql.VarChar, country);
    }
    if (platform && platform.trim() !== '') {
      whereClause += ' AND platform = @platform';
      request.input('platform', sql.VarChar, platform);
    }

    // SQL query to get distinct values
    const query = `
      SELECT
        STRING_AGG(DISTINCT sku, ',') as skuList,
        STRING_AGG(DISTINCT product_category, ',') as categoryList,
        STRING_AGG(DISTINCT product_name, ',') as productNameList,
        STRING_AGG(DISTINCT country, ',') as countryList,
        STRING_AGG(DISTINCT platform, ',') as platformList
      FROM std_pnl
      WHERE ${whereClause}
    `;

    const result = await request.query(query);

    if (result.recordset.length === 0) {
      return res.json({
        success: false,
        message: 'No data found matching the provided filters',
        data: { skuList: [], categoryList: [], productNameList: [], countryList: [], platformList: [] }
      });
    }

    const data = result.recordset[0];

    // Convert comma-separated strings to arrays
    const dropdownData = {
      skuList: data.skuList ? data.skuList.split(',').filter(item => item.trim() !== '') : [],
      categoryList: data.categoryList ? data.categoryList.split(',').filter(item => item.trim() !== '') : [],
      productNameList: data.productNameList ? data.productNameList.split(',').filter(item => item.trim() !== '') : [],
      countryList: data.countryList ? data.countryList.split(',').filter(item => item.trim() !== '') : [],
      platformList: data.platformList ? data.platformList.split(',').filter(item => item.trim() !== '') : []
    };

    res.json({
      success: true,
      message: 'PNL Dropdown data retrieved successfully',
      data: dropdownData
    });

  } catch (error) {
    console.error('PNL Dropdown service error:', error);
    res.status(500).json({ error: error.message });
  }
};
