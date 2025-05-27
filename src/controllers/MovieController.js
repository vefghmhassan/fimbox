const ScraperService = require('../services/ScraperService');

class MovieController {
    static async getHome() {
        try {
            const data = await ScraperService.getHomePageData();
            return {
                featured: {
                    title: "Featured Content",
                    items: data.sliderItems || []
                },
                sections: data.sections.map(section => ({
                    title: section.title,
                    type: section.type,
                    items: section.items
                }))
            };
        } catch (error) {
            throw new Error(`Failed to fetch home page data: ${error.message}`);
        }
    }

    static async getAllMovies() {
        try {
            return await ScraperService.scrapeMovies();
        } catch (error) {
            throw new Error(`Failed to fetch movies: ${error.message}`);
        }
    }

    static async search(query) {
        try {
            const movies = await ScraperService.scrapeMovies();
            return movies.filter(movie => 
                movie.title.toLowerCase().includes(query.toLowerCase())
            );
        } catch (error) {
            throw new Error(`Failed to search movies: ${error.message}`);
        }
    }

    static async getMovieDetails(id) {
        try {
            return await ScraperService.getVideoDetails(id);
        } catch (error) {
            throw new Error(`Failed to fetch movie details: ${error.message}`);
        }
    }
}

module.exports = MovieController; 