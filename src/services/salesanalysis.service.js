const { getPool } = require('../config/db');

exports.getComprehensiveSalesData = async (req, res) => {
  try {
    const clientId = req.user.client_id;
    const {
      // Data type selector
      dataType = 'sales', // 'sales', 'regional', 'sku-list', 'categories-list', 'product-names', 'states', 'cities', 'adData'

      // Common filters
      sku,
      productName,
      category,
      city,
      state,
      purchaseHour,
      startDate,
      endDate,
      filterType = "previousmonth",
      country,
      platform,

      // Regional specific
      fromDate,
      toDate,
      productCategory,

      // Ad data specific
      range = "lastmonth"
    } = req.query;

    const pool = getPool();

    // Handle different data types
    switch (dataType) {
      case 'sales':
        return await getSalesData(req, res, clientId, pool);
      case 'regional':
        return await getRegionalSales(req, res, clientId, pool);
      case 'sku-list':
        return await getSkuList(req, res, clientId, pool);
      case 'categories-list':
        return await getCategoriesList(req, res, clientId, pool);
      case 'product-names':
        return await getProductNames(req, res, clientId, pool);
      case 'states':
        return await getStates(req, res, clientId, pool);
      case 'cities':
        return await getCitiesList(req, res, clientId, pool);
      case 'adData':
        return await getAdData(req, res, clientId, pool);
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid dataType parameter'
        });
    }

  } catch (error) {
    console.error('Comprehensive sales data service error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Helper function for sales data
const getSalesData = async (req, res, clientId, pool) => {
  const {
    sku,
    productName,
    category,
    city,
    state,
    purchaseHour,
    startMonth,
    endMonth,
    filterType = "previousmonth",
    country,
    platform
  } = req.query;

  const today = new Date();
  const currentYear = today.getUTCFullYear();
  const currentMonth = today.getUTCMonth() + 1; // 1-based month

  // Determine date range
  let startDateObj, endDateObj;

  if (startMonth && endMonth) {
    // Custom range - supports YYYY-MM-DD or YYYY-MM
    if (startMonth.length === 7) { // YYYY-MM
      startDateObj = new Date(startMonth + '-01T00:00:00.000Z');
      endDateObj = new Date(endMonth + '-01T00:00:00.000Z');
      endDateObj.setUTCMonth(endDateObj.getUTCMonth() + 1, 0); // Last day of end month
    } else { // Assume YYYY-MM-DD
      startDateObj = new Date(startMonth + 'T00:00:00.000Z');
      endDateObj = new Date(endMonth + 'T23:59:59.999Z');
    }
  } else {
    // Based on filterType
    switch (filterType) {
      case "today":
        startDateObj = new Date(Date.UTC(currentYear, currentMonth - 1, today.getUTCDate()));
        endDateObj = new Date(Date.UTC(currentYear, currentMonth - 1, today.getUTCDate(), 23, 59, 59, 999));
        break;
      case "week":
        const dayOfWeek = today.getUTCDay();
        startDateObj = new Date(Date.UTC(currentYear, currentMonth - 1, today.getUTCDate() - dayOfWeek));
        endDateObj = new Date(Date.UTC(currentYear, currentMonth - 1, today.getUTCDate() + (6 - dayOfWeek), 23, 59, 59, 999));
        break;
      case "previousmonth":
        const prevMonth = currentMonth - 1;
        const prevYear = prevMonth < 1 ? currentYear - 1 : currentYear;
        const adjustedPrevMonth = prevMonth < 1 ? 12 : prevMonth;
        startDateObj = new Date(Date.UTC(prevYear, adjustedPrevMonth - 1, 1));
        endDateObj = new Date(Date.UTC(prevYear, adjustedPrevMonth, 0, 23, 59, 59, 999));
        break;
      case "year":
        startDateObj = new Date(Date.UTC(currentYear, 0, 1));
        endDateObj = new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59, 999));
        break;
      case "last30days":
        startDateObj = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDateObj = new Date(today);
        break;
      case "monthtodate":
        startDateObj = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
        endDateObj = new Date(today);
        break;
      case "yeartodate":
        startDateObj = new Date(Date.UTC(currentYear, 0, 1));
        endDateObj = new Date(today);
        break;
      case "6months":
        startDateObj = new Date(Date.UTC(currentYear, currentMonth - 7, 1));
        endDateObj = new Date(Date.UTC(currentYear, currentMonth - 1, today.getUTCDate(), 23, 59, 59, 999));
        break;
      case "currentmonth":
        startDateObj = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
        endDateObj = new Date(today);
        break;
      default:
        // Default to previous month
        const defaultPrevMonth = currentMonth - 1;
        const defaultPrevYear = defaultPrevMonth < 1 ? currentYear - 1 : currentYear;
        const defaultAdjustedPrevMonth = defaultPrevMonth < 1 ? 12 : defaultPrevMonth;
        startDateObj = new Date(Date.UTC(defaultPrevYear, defaultAdjustedPrevMonth - 1, 1));
        endDateObj = new Date(Date.UTC(defaultPrevYear, defaultAdjustedPrevMonth, 0, 23, 59, 59, 999));
    }
  }

  // Calculate previous year date range for comparison
  let prevStartDateObj, prevEndDateObj;
  if (startMonth && endMonth) {
    // Custom range, previous year same dates
    prevStartDateObj = new Date(Date.UTC(startDateObj.getUTCFullYear() - 1, startDateObj.getUTCMonth(), startDateObj.getUTCDate()));
    prevEndDateObj = new Date(Date.UTC(endDateObj.getUTCFullYear() - 1, endDateObj.getUTCMonth(), endDateObj.getUTCDate(), 23, 59, 59, 999));
  } else {
    // Based on filterType for previous year
    switch (filterType) {
      case "today":
        prevStartDateObj = new Date(Date.UTC(currentYear - 1, currentMonth - 1, today.getUTCDate()));
        prevEndDateObj = new Date(Date.UTC(currentYear - 1, currentMonth - 1, today.getUTCDate(), 23, 59, 59, 999));
        break;
      case "week":
        const prevDayOfWeek = today.getUTCDay();
        prevStartDateObj = new Date(Date.UTC(currentYear - 1, currentMonth - 1, today.getUTCDate() - prevDayOfWeek));
        prevEndDateObj = new Date(Date.UTC(currentYear - 1, currentMonth - 1, today.getUTCDate() + (6 - prevDayOfWeek), 23, 59, 59, 999));
        break;
      case "previousmonth":
        const prevPrevMonth = currentMonth - 1;
        const prevPrevYear = prevPrevMonth < 1 ? currentYear - 1 : currentYear;
        const prevAdjustedPrevMonth = prevPrevMonth < 1 ? 12 : prevPrevMonth;
        prevStartDateObj = new Date(Date.UTC(prevPrevYear - 1, prevAdjustedPrevMonth - 1, 1));
        prevEndDateObj = new Date(Date.UTC(prevPrevYear - 1, prevAdjustedPrevMonth, 0, 23, 59, 59, 999));
        break;
      case "year":
        prevStartDateObj = new Date(Date.UTC(currentYear - 1, 0, 1));
        prevEndDateObj = new Date(Date.UTC(currentYear - 1, 11, 31, 23, 59, 59, 999));
        break;
      case "last30days":
        prevStartDateObj = new Date(startDateObj.getTime() - 365 * 24 * 60 * 60 * 1000);
        prevEndDateObj = new Date(endDateObj.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case "monthtodate":
        prevStartDateObj = new Date(Date.UTC(currentYear - 1, currentMonth - 1, 1));
        prevEndDateObj = new Date(Date.UTC(currentYear - 1, currentMonth - 1, today.getUTCDate(), 23, 59, 59, 999));
        break;
      case "yeartodate":
        prevStartDateObj = new Date(Date.UTC(currentYear - 1, 0, 1));
        prevEndDateObj = new Date(Date.UTC(currentYear - 1, today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999));
        break;
      case "6months":
        prevStartDateObj = new Date(Date.UTC(currentYear - 1, currentMonth - 7, 1));
        prevEndDateObj = new Date(Date.UTC(currentYear - 1, currentMonth - 1, today.getUTCDate(), 23, 59, 59, 999));
        break;
      case "currentmonth":
        prevStartDateObj = new Date(Date.UTC(currentYear - 1, currentMonth - 1, 1));
        prevEndDateObj = new Date(Date.UTC(currentYear - 1, currentMonth - 1, today.getUTCDate(), 23, 59, 59, 999));
        break;
      default:
        // Default to previous month
        const defaultPrevPrevMonth = currentMonth - 1;
        const defaultPrevPrevYear = defaultPrevPrevMonth < 1 ? currentYear - 1 : currentYear;
        const defaultPrevAdjustedPrevMonth = defaultPrevPrevMonth < 1 ? 12 : defaultPrevPrevMonth;
        prevStartDateObj = new Date(Date.UTC(defaultPrevPrevYear - 1, defaultPrevAdjustedPrevMonth - 1, 1));
        prevEndDateObj = new Date(Date.UTC(defaultPrevPrevYear - 1, defaultPrevAdjustedPrevMonth, 0, 23, 59, 59, 999));
    }
  }

  // Build WHERE conditions (without date)
  let whereConditions = [`client_id = '${clientId}'`];
  if (sku) whereConditions.push(`sku IN ('${sku.split(',').map(s => s.trim()).join("','")}')`);
  if (productName) whereConditions.push(`product_name LIKE '%${productName}%'`);
  if (category) whereConditions.push(`product_category = '${category}'`);
  if (city) whereConditions.push(`city = '${city}'`);
  if (state) whereConditions.push(`state = '${state}'`);
  if (purchaseHour !== undefined) whereConditions.push(`purchase_hour = ${parseInt(purchaseHour)}`);
  if (country) whereConditions.push(`country LIKE '%${country}%'`);
  if (platform) whereConditions.push(`platform LIKE '%${platform}%'`);

  const formatDate = (date) => date.toISOString().split('T')[0];

  // Current period query
  const currentWhere = [...whereConditions, `purchase_date >= '${formatDate(startDateObj)}' AND purchase_date <= '${formatDate(endDateObj)}'`];
  const currentQuery = `
    SELECT
      purchase_date as "purchase-date",
      purchase_hour as "purchase-hour",
      purchase_time as "purchase-time",
      order_status as "order-status",
      sku as "SKU",
      CAST(quantity AS FLOAT) as "Quantity",
      CAST(total_sales AS FLOAT) as "Total_Sales",
      CAST(item_price AS FLOAT) as "item-price",
      city as "City",
      state as "State",
      CAST(aov AS FLOAT) as "AOV",
      product_category as "Product Category",
      product_name as "Product Name"
    FROM std_orders
    WHERE ${currentWhere.join(' AND ')}
    ORDER BY purchase_date DESC
  `;

  // Previous year query
  const prevWhere = [...whereConditions, `purchase_date >= '${formatDate(prevStartDateObj)}' AND purchase_date <= '${formatDate(prevEndDateObj)}'`];
  const prevQuery = `
    SELECT
      purchase_date as "purchase-date",
      purchase_hour as "purchase-hour",
      purchase_time as "purchase-time",
      order_status as "order-status",
      sku as "SKU",
      CAST(quantity AS FLOAT) as "Quantity",
      CAST(total_sales AS FLOAT) as "Total_Sales",
      CAST(item_price AS FLOAT) as "item-price",
      city as "City",
      state as "State",
      CAST(aov AS FLOAT) as "AOV",
      product_category as "Product Category",
      product_name as "Product Name"
    FROM std_orders
    WHERE ${prevWhere.join(' AND ')}
    ORDER BY purchase_date DESC
  `;

  console.log('Current sales query:', currentQuery); // Debug log
  console.log('Previous sales query:', prevQuery); // Debug log

  const currentResult = await pool.request().query(currentQuery);
  const prevResult = await pool.request().query(prevQuery);

  res.json({
    success: true,
    message: 'Sales data retrieved successfully',
    data: {
      current: currentResult.recordset,
      previous: prevResult.recordset
    },
    filters: {
      clientId,
      dateRange: {
        current: {
          start: formatDate(startDateObj),
          end: formatDate(endDateObj)
        },
        previous: {
          start: formatDate(prevStartDateObj),
          end: formatDate(prevEndDateObj)
        }
      },
      appliedFilters: {
        sku,
        productName,
        category,
        city,
        state,
        purchaseHour,
        startMonth,
        endMonth,
        country,
        platform,
        filterType
      }
    }
  });
};

// Helper function for regional sales
const getRegionalSales = async (req, res, clientId, pool) => {
  const {
    sku,
    filterType = "lastmonth",
    fromDate,
    toDate,
    productCategory,
    state,
    city,
    country,
    platform
  } = req.query;

  const today = new Date();
  const currentYear = today.getUTCFullYear();
  const currentMonth = today.getUTCMonth();

  let startDate, endDate, prevStartDate, prevEndDate;

  // Date range logic
  if (fromDate && toDate) {
    startDate = new Date(fromDate);
    endDate = new Date(toDate);
    endDate.setHours(23, 59, 59, 999);
    // For custom, previous period with same duration
    const duration = endDate.getTime() - startDate.getTime();
    prevEndDate = new Date(startDate.getTime() - 1);
    prevStartDate = new Date(prevEndDate.getTime() - duration);
  } else {
    switch (filterType) {
      case "today":
        startDate = new Date(Date.UTC(currentYear, currentMonth, today.getUTCDate()));
        endDate = new Date(Date.UTC(currentYear, currentMonth, today.getUTCDate(), 23, 59, 59, 999));
        prevStartDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
        prevEndDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "week":
        const dayOfWeek = today.getUTCDay();
        startDate = new Date(Date.UTC(currentYear, currentMonth, today.getUTCDate() - dayOfWeek));
        endDate = new Date(Date.UTC(currentYear, currentMonth, today.getUTCDate() + (6 - dayOfWeek), 23, 59, 59, 999));
        prevStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        prevEndDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "previousmonth":
        const lastMonth = currentMonth - 1;
        const lastMonthYear = lastMonth < 0 ? currentYear - 1 : currentYear;
        const adjustedLastMonth = (lastMonth + 12) % 12;
        startDate = new Date(Date.UTC(lastMonthYear, adjustedLastMonth, 1));
        endDate = new Date(Date.UTC(lastMonthYear, adjustedLastMonth + 1, 0, 23, 59, 59, 999));
        // Previous is the month before lastmonth
        const prevMonth = adjustedLastMonth - 1;
        const prevMonthYear = prevMonth < 0 ? lastMonthYear - 1 : lastMonthYear;
        const adjustedPrevMonth = (prevMonth + 12) % 12;
        prevStartDate = new Date(Date.UTC(prevMonthYear, adjustedPrevMonth, 1));
        prevEndDate = new Date(Date.UTC(prevMonthYear, adjustedPrevMonth + 1, 0, 23, 59, 59, 999));
        break;
      case "year":
        startDate = new Date(Date.UTC(currentYear, 0, 1));
        endDate = new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59, 999));
        prevStartDate = new Date(Date.UTC(currentYear - 1, 0, 1));
        prevEndDate = new Date(Date.UTC(currentYear - 1, 11, 31, 23, 59, 59, 999));
        break;
      case "last30days":
        startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDate = new Date(today);
        prevStartDate = new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        prevEndDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "currentmonth":
        startDate = new Date(Date.UTC(currentYear, currentMonth, 1));
        endDate = new Date(today);
        // Previous month, same days
        const prevMonthDate = new Date(Date.UTC(currentYear, currentMonth - 1, today.getUTCDate()));
        prevStartDate = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
        prevEndDate = prevMonthDate;
        break;
      case "currentyear":
        startDate = new Date(Date.UTC(currentYear, 0, 1));
        endDate = new Date(today);
        prevStartDate = new Date(Date.UTC(currentYear - 1, 0, 1));
        prevEndDate = new Date(Date.UTC(currentYear - 1, today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999));
        break;
      case "6months":
        startDate = new Date(Date.UTC(currentYear, currentMonth - 5, 1));
        endDate = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999));
        prevStartDate = new Date(Date.UTC(currentYear, currentMonth - 11, 1));
        prevEndDate = new Date(Date.UTC(currentYear, currentMonth - 5, 0, 23, 59, 59, 999));
        break;
      default:
        startDate = new Date(Date.UTC(currentYear, currentMonth - 5, 1));
        endDate = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999));
        prevStartDate = new Date(Date.UTC(currentYear, currentMonth - 11, 1));
        prevEndDate = new Date(Date.UTC(currentYear, currentMonth - 5, 0, 23, 59, 59, 999));
    }
  }

  // Build WHERE conditions
  let whereConditions = [`client_id = '${clientId}'`];
  if (sku) whereConditions.push(`sku IN ('${sku.split(',').map(s => s.trim()).join("','")}')`);
  if (productCategory) whereConditions.push(`product_category = '${productCategory}'`);
  if (state) whereConditions.push(`state = '${state}'`);
  if (city) whereConditions.push(`city = '${city}'`);
  if (country) whereConditions.push(`country LIKE '%${country}%'`);
  if (platform) whereConditions.push(`platform LIKE '%${platform}%'`);

  // Date filter using SQL date ranges
  const formatDate = (date) => date.toISOString().split('T')[0];
  const currentStart = formatDate(startDate);
  const currentEnd = formatDate(endDate);
  const prevStart = formatDate(prevStartDate);
  const prevEnd = formatDate(prevEndDate);

  // Regional aggregation for current
  const regionalQuery = `
    SELECT
      state,
      city,
      SUM(CAST(total_sales AS FLOAT)) as totalSales,
      SUM(CAST(quantity AS FLOAT)) as totalQuantity,
      COUNT(DISTINCT order_id) as totalOrders
    FROM std_orders
    WHERE ${whereConditions.join(' AND ')}
      AND purchase_date >= '${currentStart}' AND purchase_date <= '${currentEnd}'
    GROUP BY state, city
    ORDER BY totalSales DESC
  `;

  // Regional for previous
  const prevRegionalQuery = `
    SELECT
      state,
      city,
      SUM(CAST(total_sales AS FLOAT)) as totalSales,
      SUM(CAST(quantity AS FLOAT)) as totalQuantity,
      COUNT(DISTINCT order_id) as totalOrders
    FROM std_orders
    WHERE ${whereConditions.join(' AND ')}
      AND purchase_date >= '${prevStart}' AND purchase_date <= '${prevEnd}'
    GROUP BY state, city
  `;

  // Daily breakdown
  const dailyQuery = `
    SELECT
      CAST(purchase_date AS DATE) as date,
      SUM(CAST(total_sales AS FLOAT)) as sales,
      SUM(CAST(quantity AS FLOAT)) as quantity,
      COUNT(DISTINCT order_id) as orders
    FROM std_orders
    WHERE ${whereConditions.join(' AND ')}
      AND purchase_date >= '${currentStart}' AND purchase_date <= '${currentEnd}'
    GROUP BY CAST(purchase_date AS DATE)
    ORDER BY date
  `;

  const regionalResults = await pool.request().query(regionalQuery);
  const prevRegionalResults = await pool.request().query(prevRegionalQuery);
  const dailyResults = await pool.request().query(dailyQuery);

  // Calculate comparison
  const results = regionalResults.recordset.map(curr => {
    const prev = prevRegionalResults.recordset.find(p => p.state === curr.state && p.city === curr.city) || { totalSales: 0, totalQuantity: 0, totalOrders: 0 };
    const salesChange = prev.totalSales > 0 ? ((curr.totalSales - prev.totalSales) / prev.totalSales * 100).toFixed(2) : 'N/A';
    const quantityChange = prev.totalQuantity > 0 ? ((curr.totalQuantity - prev.totalQuantity) / prev.totalQuantity * 100).toFixed(2) : 'N/A';
    const ordersChange = prev.totalOrders > 0 ? ((curr.totalOrders - prev.totalOrders) / prev.totalOrders * 100).toFixed(2) : 'N/A';

    return {
      ...curr,
      comparison: {
        previousSales: prev.totalSales,
        previousQuantity: prev.totalQuantity,
        previousOrders: prev.totalOrders,
        salesChangePercent: salesChange,
        quantityChangePercent: quantityChange,
        ordersChangePercent: ordersChange
      }
    };
  });

  res.json({
    success: true,
    message: 'Regional sales data retrieved successfully',
    data: {
      regional: results,
      daily: dailyResults.recordset
    }
  });
};

// Helper function for SKU list
const getSkuList = async (req, res, clientId, pool) => {
  const query = `
    SELECT DISTINCT sku
    FROM std_orders
    WHERE client_id = '${clientId}'
    ORDER BY sku
  `;

  const result = await pool.request().query(query);
  res.json({
    success: true,
    message: 'SKU list retrieved successfully',
    data: result.recordset.map(row => row.sku)
  });
};

// Helper function for categories list
const getCategoriesList = async (req, res, clientId, pool) => {
  const query = `
    SELECT DISTINCT product_category
    FROM std_orders
    WHERE client_id = '${clientId}' AND product_category IS NOT NULL
    ORDER BY product_category
  `;

  const result = await pool.request().query(query);
  res.json({
    success: true,
    message: 'Categories list retrieved successfully',
    data: result.recordset.map(row => row.product_category)
  });
};

// Helper function for product names
const getProductNames = async (req, res, clientId, pool) => {
  const query = `
    SELECT DISTINCT product_name
    FROM std_orders
    WHERE client_id = '${clientId}' AND product_name IS NOT NULL
    ORDER BY product_name
  `;

  const result = await pool.request().query(query);
  res.json({
    success: true,
    message: 'Product names list retrieved successfully',
    data: result.recordset.map(row => row.product_name)
  });
};

// Helper function for states
const getStates = async (req, res, clientId, pool) => {
  const query = `
    SELECT DISTINCT state
    FROM std_orders
    WHERE client_id = '${clientId}' AND state IS NOT NULL
    ORDER BY state
  `;

  const result = await pool.request().query(query);
  res.json({
    success: true,
    message: 'States list retrieved successfully',
    data: result.recordset.map(row => row.state)
  });
};

// Helper function for cities list
const getCitiesList = async (req, res, clientId, pool) => {
  const query = `
    SELECT DISTINCT city
    FROM std_orders
    WHERE client_id = '${clientId}' AND city IS NOT NULL
    ORDER BY city
  `;

  const result = await pool.request().query(query);
  res.json({
    success: true,
    message: 'Cities list retrieved successfully',
    data: result.recordset.map(row => row.city)
  });
};

// Helper function for ad data
const getAdData = async (req, res, clientId, pool) => {
  const { range = "lastmonth", startDate, endDate, sku, country, platform } = req.query;

  const today = new Date();
  const currentYear = today.getUTCFullYear();
  const currentMonth = today.getUTCMonth() + 1;

  let currentStartMonth, currentEndMonth;
  let previousStartMonth, previousEndMonth;

  // Date ranges for month-based
  if (range === "custom" && startDate && endDate) {
    const [startYear, startMonth] = startDate.split('-').map(Number);
    const [endYear, endMonth] = endDate.split('-').map(Number);
    currentStartMonth = { year: startYear, month: startMonth };
    currentEndMonth = { year: endYear, month: endMonth };

    const durationMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
    previousEndMonth = { year: startYear, month: startMonth };
    const prevStartDate = new Date(Date.UTC(previousEndMonth.year, previousEndMonth.month - durationMonths, 1));
    previousStartMonth = { year: prevStartDate.getUTCFullYear(), month: prevStartDate.getUTCMonth() + 1 };
  } else {
    switch (range) {
      case "previousmonth":
        const prevMonth = currentMonth - 1;
        const prevYear = prevMonth < 1 ? currentYear - 1 : currentYear;
        const adjustedPrevMonth = prevMonth < 1 ? 12 : prevMonth;
        currentStartMonth = { year: prevYear, month: adjustedPrevMonth };
        currentEndMonth = { year: prevYear, month: adjustedPrevMonth };
        previousStartMonth = { year: prevYear, month: adjustedPrevMonth - 1 || 12 };
        previousEndMonth = { year: prevYear, month: adjustedPrevMonth - 1 || 12 };
        break;
      case "currentyear":
        currentStartMonth = { year: currentYear, month: 1 };
        currentEndMonth = { year: currentYear, month: currentMonth };
        previousStartMonth = { year: currentYear - 1, month: 1 };
        previousEndMonth = { year: currentYear - 1, month: currentMonth };
        break;
      case "last6months":
        const startMonthNum = currentMonth - 5;
        const startYear = startMonthNum < 1 ? currentYear - 1 : currentYear;
        const adjustedStartMonth = startMonthNum < 1 ? startMonthNum + 12 : startMonthNum;
        currentStartMonth = { year: startYear, month: adjustedStartMonth };
        currentEndMonth = { year: currentYear, month: currentMonth };
        const prevEndMonthNum = adjustedStartMonth - 1;
        const prevEndYear = prevEndMonthNum < 1 ? startYear - 1 : startYear;
        const adjustedPrevEndMonth = prevEndMonthNum < 1 ? 12 : prevEndMonthNum;
        previousEndMonth = { year: prevEndYear, month: adjustedPrevEndMonth };
        const prevStartMonthNum = adjustedPrevEndMonth - 5;
        const prevStartYear = prevStartMonthNum < 1 ? prevEndYear - 1 : prevEndYear;
        const adjustedPrevStartMonth = prevStartMonthNum < 1 ? prevStartMonthNum + 12 : prevStartMonthNum;
        previousStartMonth = { year: prevStartYear, month: adjustedPrevStartMonth };
        break;
      case "currentmonth":
        currentStartMonth = { year: currentYear, month: currentMonth };
        currentEndMonth = { year: currentYear, month: currentMonth };
        const prevMonth2 = currentMonth - 1;
        const prevYear2 = prevMonth2 < 1 ? currentYear - 1 : currentYear;
        const adjustedPrevMonth2 = prevMonth2 < 1 ? 12 : prevMonth2;
        previousStartMonth = { year: prevYear2, month: adjustedPrevMonth2 };
        previousEndMonth = { year: prevYear2, month: adjustedPrevMonth2 };
        break;
      case "today":
        // For today, perhaps use current month
        currentStartMonth = { year: currentYear, month: currentMonth };
        currentEndMonth = { year: currentYear, month: currentMonth };
        previousStartMonth = { year: currentYear, month: currentMonth - 1 || 12 };
        previousEndMonth = { year: currentYear, month: currentMonth - 1 || 12 };
        break;
      default:
        currentStartMonth = { year: currentYear, month: currentMonth - 5 };
        currentEndMonth = { year: currentYear, month: currentMonth };
        previousStartMonth = { year: currentYear, month: currentMonth - 11 };
        previousEndMonth = { year: currentYear, month: currentMonth - 6 };
    }
  }

  // Filters
  let whereConditions = [`client_id = '${clientId}'`];
  if (platform) whereConditions.push(`platform = '${platform}'`);
  if (country) whereConditions.push(`country = '${country}'`);
  if (sku) whereConditions.push(`sku = '${sku}'`);

  // Generate month ranges
  const generateMonthRange = (start, end) => {
    const months = [];
    let current = new Date(Date.UTC(start.year, start.month - 1, 1));
    const endDate = new Date(Date.UTC(end.year, end.month - 1, 1));
    while (current <= endDate) {
      const year = current.getUTCFullYear();
      const month = current.getUTCMonth() + 1;
      months.push(`${year}-${month.toString().padStart(2, '0')}`);
      current.setUTCMonth(current.getUTCMonth() + 1);
    }
    return months;
  };

  const currentMonths = generateMonthRange(currentStartMonth, currentEndMonth);
  const previousMonths = generateMonthRange(previousStartMonth, previousEndMonth);

  // Aggregate current from ads_sales_and_spend table
  const currentQuery = `
    SELECT
      SUM(CAST(ad_sales AS FLOAT)) as totalAdSales,
      SUM(CAST(ad_spend AS FLOAT)) as totalAdSpend,
      SUM(CAST(total_gross_sales AS FLOAT)) as totalRevenue
    FROM ads_sales_and_spend
    WHERE ${whereConditions.join(' AND ')}
      AND year_month IN ('${currentMonths.join("','")}')
  `;

  // Aggregate previous
  const previousQuery = `
    SELECT
      SUM(CAST(ad_sales AS FLOAT)) as totalAdSales,
      SUM(CAST(ad_spend AS FLOAT)) as totalAdSpend,
      SUM(CAST(total_gross_sales AS FLOAT)) as totalRevenue
    FROM ads_sales_and_spend
    WHERE ${whereConditions.join(' AND ')}
      AND year_month IN ('${previousMonths.join("','")}')
  `;

  const currentResult = await pool.request().query(currentQuery);
  const current = currentResult.recordset[0] || { totalAdSales: 0, totalAdSpend: 0, totalRevenue: 0 };

  const previousResult = await pool.request().query(previousQuery);
  const previous = previousResult.recordset[0] || { totalAdSales: 0, totalAdSpend: 0, totalRevenue: 0 };

  // Calculate metrics
  const calculateMetrics = (data) => {
    const { totalAdSales, totalAdSpend, totalRevenue } = data;
    const ACOS = totalAdSales > 0 ? (totalAdSpend / totalAdSales) * 100 : 0;
    const TACOS = totalRevenue > 0 ? (totalAdSpend / totalRevenue) * 100 : 0;
    const ROAS = totalAdSpend > 0 ? totalAdSales / totalAdSpend : 0;
    const organicRevenue = totalRevenue - totalAdSales;
    return {
      adSales: totalAdSales.toFixed(2),
      adSpend: totalAdSpend.toFixed(2),
      revenue: totalRevenue.toFixed(2),
      ACOS: ACOS.toFixed(2),
      TACOS: TACOS.toFixed(2),
      ROAS: ROAS.toFixed(2),
      organicRevenue: organicRevenue.toFixed(2)
    };
  };

  const currentMetrics = calculateMetrics(current);
  const previousMetrics = calculateMetrics(previous);

  const getPercentChange = (curr, prev) => {
    if (parseFloat(prev) === 0) return "0.00";
    const diff = ((parseFloat(curr) - parseFloat(prev)) / parseFloat(prev)) * 100;
    return diff.toFixed(2);
  };

  const percent = {
    adSalesChangePercent: getPercentChange(currentMetrics.adSales, previousMetrics.adSales),
    adSpendChangePercent: getPercentChange(currentMetrics.adSpend, previousMetrics.adSpend),
    revenueChangePercent: getPercentChange(currentMetrics.revenue, previousMetrics.revenue),
    acosChangePercent: getPercentChange(currentMetrics.ACOS, previousMetrics.ACOS),
    tacosChangePercent: getPercentChange(currentMetrics.TACOS, previousMetrics.TACOS),
    roasChangePercent: getPercentChange(currentMetrics.ROAS, previousMetrics.ROAS),
    organicRevenueChangePercent: getPercentChange(currentMetrics.organicRevenue, previousMetrics.organicRevenue)
  };

  res.json({
    success: true,
    message: 'Ad data retrieved successfully',
    data: {
      current: currentMetrics,
      previous: previousMetrics,
      percent
    }
  });
};
