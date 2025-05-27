const swaggerJsdoc = require('swagger-jsdoc');
const config = require('./config');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'MyF2M API',
            version: '1.0.0',
            description: 'API for scraping movie and series data from myf2m.net',
            contact: {
                name: 'API Support'
            }
        },
        servers: [
            {
                url: `http://localhost:${config.PORT}/api/${config.API_VERSION}`,
                description: 'Development server'
            }
        ],
        components: {
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false
                        },
                        error: {
                            type: 'object',
                            properties: {
                                message: {
                                    type: 'string',
                                    example: 'Error message'
                                }
                            }
                        }
                    }
                },
                Movie: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        title: { type: 'string' },
                        rating: { type: 'string' },
                        year: { type: 'string' },
                        genres: {
                            type: 'array',
                            items: { type: 'string' }
                        },
                        image: { type: 'string' },
                        link: { type: 'string' },
                        quality: { type: 'string' }
                    }
                },
                Category: {
                    type: 'object',
                    properties: {
                        title: { type: 'string' },
                        link: { type: 'string' },
                        count: { type: 'number' }
                    }
                }
            }
        }
    },
    apis: ['./src/routes/*.js']
};

module.exports = swaggerJsdoc(options); 