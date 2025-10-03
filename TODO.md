# TODO: Update Sales Analysis API for Year-over-Year Comparison

## Tasks
- [x] Modify getSalesData function in src/services/salesanalysis.service.js to calculate previous year date range
- [x] Update the SQL query to fetch data for both current and previous year periods
- [x] Modify the response structure to include both current and previous year data for comparison
- [x] Test the API with filterType=previousmonth to verify year-over-year data is returned

## Deployment Guide

### Prerequisites
- Node.js installed
- Git repository set up
- Hosting platform account (e.g., Heroku, Render, Railway)

### Database Setup
1. **MongoDB**: Set up a MongoDB Atlas cluster
   - Create a new cluster
   - Get the connection string (MONGODB_URI)

2. **SQL Database**: Use Azure SQL or another SQL service
   - Create a database instance
   - Get connection details (server, database, user, password)
   - Run the SQL script in `src/config/create_user_table.sql` on your database

### Environment Variables
Update the `.env` file with production values:
- DB_SERVER: Your SQL server URL
- DB_DATABASE: Your SQL database name
- DB_USER: Your SQL username
- DB_PASSWORD: Your SQL password
- MONGODB_URI: Your MongoDB connection string
- JWT_SECRET: A secure random string for JWT
- PORT: Port for the server (default 3110)

### Deployment Steps
1. **Choose a hosting platform** (e.g., Heroku, Render, Railway)
2. **Connect your Git repository** to the platform
3. **Set environment variables** in the platform's dashboard
4. **Deploy the application**
5. **Verify the deployment** by checking the API endpoints

### Example: Deploying to Heroku
1. Install Heroku CLI
2. `heroku create your-app-name`
3. `heroku config:set DB_SERVER=your_server DB_DATABASE=your_db ...` (set all env vars)
4. `git push heroku main`
5. `heroku open` to view the app

### Post-Deployment
- Test all API endpoints
- Monitor logs for any errors
- Ensure database connections are working
