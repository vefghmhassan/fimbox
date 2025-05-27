const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const movieRoutes = require('./routes/movieRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const { errorHandler } = require('./utils/errorHandler');
const config = require('./config/config');

const app = express();

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'MyF2M API Documentation'
}));

// API Routes
app.use(`/api/${config.API_VERSION}/movies`, movieRoutes);
app.use(`/api/${config.API_VERSION}/categories`, categoryRoutes);

// Root route redirects to index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: {
            message: 'Route not found'
        }
    });
});

module.exports = app; 