const express = require('express');
const cors = require('cors');
const { 
    scrapeMovies, 
    getVideoDetails, 
    getHomePageData, 
    getCategories, 
    getCategoryContent 
} = require('./scraper');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// GET /api/home - Get home page data including sliders and sections
app.get('/api/home', async (req, res) => {
    try {
        const homeData = await getHomePageData();
        
        // Add metadata to the response
        const response = {
            success: true,
            timestamp: new Date().toISOString(),
            data: {
                featured: {
                    title: "Featured Content",
                    items: homeData.sliderItems || []
                },
                sections: homeData.sections.map(section => ({
                    title: section.title,
                    type: section.title.toLowerCase().includes('series') ? 'series' : 'movies',
                    items: section.items.map(item => ({
                        ...item,
                        type: section.title.toLowerCase().includes('series') ? 'series' : 'movie',
                        fullLink: `${item.link}`,
                        posterImage: item.image,
                        metadata: {
                            year: item.year,
                            rating: item.rating,
                            genres: item.genres
                        }
                    }))
                }))
            }
        };

        res.json(response);
    } catch (error) {
        console.error('Home page error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to fetch home page data',
                details: error.message
            },
            timestamp: new Date().toISOString()
        });
    }
});

// GET /api/categories - Get all categories
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await getCategories();
        res.json({
            success: true,
            count: categories.length,
            data: categories
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/categories/:categoryUrl/content - Get content for a specific category
app.get('/api/categories/:categoryUrl/content', async (req, res) => {
    try {
        const { categoryUrl } = req.params;
        const decodedUrl = decodeURIComponent(categoryUrl);
        const items = await getCategoryContent(decodedUrl);
        res.json({
            success: true,
            count: items.length,
            data: items
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/movies - Get all movies
app.get('/api/movies', async (req, res) => {
    try {
        const movies = await scrapeMovies();
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

// GET /api/movies/:id/videos - Get video sources and related content for a specific movie
app.get('/api/movies/:id/videos', async (req, res) => {
    try {
        const movieUrl = `https://www.f2medx.ir/${req.params.id}`;
        const data = await getVideoDetails(movieUrl);
        
        res.json({
            success: true,
            data: {
                content: {
                    ...data.currentContent,
                    sources: data.videoSources
                },
                related: {
                    title: "Related Content",
                    items: data.relatedContent
                },
                newReleases: {
                    movies: {
                        title: "Latest Movies",
                        items: data.newReleases.movies
                    },
                    series: {
                        title: "Latest Series",
                        items: data.newReleases.series
                    }
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to fetch video details',
                details: error.message
            }
        });
    }
});

// GET /api/search - Search movies by title
app.get('/api/search', async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Search query is required'
            });
        }

        const movies = await scrapeMovies();
        const searchResults = movies.filter(movie => 
            movie.title.toLowerCase().includes(query.toLowerCase())
        );

        res.json({
            success: true,
            count: searchResults.length,
            data: searchResults
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Internal Server Error'
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
}); 