const express = require('express');
const router = express.Router();
const MovieController = require('../controllers/MovieController');
const CategoryController = require('../controllers/CategoryController');

/**
 * @swagger
 * /movies/home:
 *   get:
 *     summary: Get home page data including featured content and sections
 *     tags: [Movies]
 *     responses:
 *       200:
 *         description: Home page data with featured content and sections
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 data:
 *                   type: object
 *                   properties:
 *                     featured:
 *                       type: object
 *                       properties:
 *                         title:
 *                           type: string
 *                           example: "Featured Content"
 *                         items:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Movie'
 *                     sections:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           title:
 *                             type: string
 *                           type:
 *                             type: string
 *                           items:
 *                             type: array
 *                             items:
 *                               $ref: '#/components/schemas/Movie'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/home', async (req, res) => {
    try {
        const data = await MovieController.getHome();
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @swagger
 * /movies:
 *   get:
 *     summary: Get all movies
 *     tags: [Movies]
 *     responses:
 *       200:
 *         description: List of all movies
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 100
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Movie'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (req, res) => {
    try {
        const movies = await MovieController.getAllMovies();
        res.json({
            success: true,
            count: movies.length,
            data: movies
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @swagger
 * /movies/search:
 *   get:
 *     summary: Search for movies
 *     tags: [Movies]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 5
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Movie'
 *       400:
 *         description: Missing search query
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/search', async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Search query is required'
            });
        }

        const results = await MovieController.search(query);
        res.json({
            success: true,
            count: results.length,
            data: results
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @swagger
 * /movies/{id}:
 *   get:
 *     summary: Get movie details by ID
 *     tags: [Movies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Movie ID
 *     responses:
 *       200:
 *         description: Movie details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     currentContent:
 *                       type: object
 *                       properties:
 *                         title:
 *                           type: string
 *                         description:
 *                           type: string
 *                         rating:
 *                           type: string
 *                         year:
 *                           type: string
 *                         duration:
 *                           type: string
 *                         quality:
 *                           type: string
 *                         genres:
 *                           type: array
 *                           items:
 *                             type: string
 *                         cast:
 *                           type: array
 *                           items:
 *                             type: string
 *                         director:
 *                           type: string
 *                         country:
 *                           type: string
 *                     videoSources:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                           url:
 *                             type: string
 *                           quality:
 *                             type: string
 *                     relatedContent:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Movie'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const details = await MovieController.getMovieDetails(id);
        res.json({
            success: true,
            data: details
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Categories
router.get('/categories', CategoryController.getCategories);
router.get('/categories/:categoryUrl/content', CategoryController.getCategoryContent);

module.exports = router; 