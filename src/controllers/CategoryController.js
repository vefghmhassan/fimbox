const ScraperService = require('../services/ScraperService');

class CategoryController {
    static async getCategories() {
        try {
            return await ScraperService.getCategories();
        } catch (error) {
            throw new Error(`Failed to fetch categories: ${error.message}`);
        }
    }

    static async getCategoryContent(categoryUrl) {
        try {
            return await ScraperService.getCategoryContent(categoryUrl);
        } catch (error) {
            throw new Error(`Failed to fetch category content: ${error.message}`);
        }
    }
}

module.exports = CategoryController; 