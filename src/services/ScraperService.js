const { chromium } = require('playwright');
const cheerio = require('cheerio');
const config = require('../config/config');
const axios = require('axios');
const Movie = require('../models/Movie');
const Category = require('../models/Category');

class ScraperService {
    constructor() {
        this.browser = null;
        this.context = null;
        this.headers = {
            'User-Agent': config.USER_AGENT,
            ...config.HEADERS
        };
    }

    async initBrowser() {
        if (!this.browser) {
            this.browser = await chromium.launch({ 
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            this.context = await this.browser.newContext({
                userAgent: config.USER_AGENT,
                viewport: { width: 1920, height: 1080 },
                extraHTTPHeaders: config.HEADERS
            });
        }
    }

    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.context = null;
        }
    }

    async getPage(url) {
        try {
            const response = await axios.get(url, { 
                headers: this.headers,
                timeout: 30000
            });
            return response.data;
        } catch (error) {
            console.error(`Error fetching page ${url}:`, error.message);
            throw error;
        }
    }

    async getHomePageData() {
        try {
            const content = await this.getPage(config.BASE_URL);
            const $ = cheerio.load(content);

            // Get featured content from the slider
            const featured = {
                title: "Featured Content",
                items: []
            };

            $('.splide__list article.entry').each((_, element) => {
                const $element = $(element);
                const item = {
                    title: $element.find('h2.entry-title').text().trim(),
                    link: $element.find('a.stretched-link').attr('href'),
                    image: $element.find('img.wp-post-image').attr('data-splide-lazy') || 
                           $element.find('img.wp-post-image').attr('src'),
                    rating: $element.find('.entry-meta strong').text().trim(),
                    year: $element.find('.entry-meta svg[href="#icon-calendar"]')
                        .parent()
                        .text()
                        .trim()
                };

                if (item.title && item.link) {
                    // Make sure the link is absolute
                    if (!item.link.startsWith('http')) {
                        item.link = config.BASE_URL + (item.link.startsWith('/') ? '' : '/') + item.link;
                    }
                    if (!item.image?.startsWith('http')) {
                        item.image = item.image ? config.BASE_URL + (item.image.startsWith('/') ? '' : '/') + item.image : null;
                    }
                    featured.items.push(item);
                }
            });

            // Get sections
            const sections = [];
            $('.list-section').each((_, section) => {
                const $section = $(section);
                const sectionData = {
                    title: $section.find('#carougsel-posts6-title').text().trim() || 'Latest Content',
                    items: []
                };

                $section.find('article.entry').each((_, article) => {
                    const $article = $(article);
                    const item = {
                        title: $article.find('h2.entry-title').text().trim(),
                        link: $article.find('a.stretched-link').attr('href'),
                        image: $article.find('img.wp-post-image').attr('data-splide-lazy') || 
                               $article.find('img.wp-post-image').attr('src'),
                        rating: $article.find('.entry-meta strong').text().trim(),
                        year: $article.find('.entry-meta svg[href="#icon-calendar"]')
                            .parent()
                            .text()
                            .trim()
                    };

                    if (item.title && item.link) {
                        // Make sure the link is absolute
                        if (!item.link.startsWith('http')) {
                            item.link = config.BASE_URL + (item.link.startsWith('/') ? '' : '/') + item.link;
                        }
                        if (!item.image?.startsWith('http')) {
                            item.image = item.image ? config.BASE_URL + (item.image.startsWith('/') ? '' : '/') + item.image : null;
                        }
                        sectionData.items.push(item);
                    }
                });

                if (sectionData.items.length > 0) {
                    sections.push(sectionData);
                }
            });

            return {
                featured,
                sections
            };
        } catch (error) {
            console.error('Error in getHomePageData:', error);
            throw error;
        }
    }

    async extractMovieInfo($, element) {
        const $element = $(element);
        
        // Try different selectors for title
        const title = $element.find('h2, h3, .title, .name, a[title]').first().text().trim() || 
                     $element.find('a').first().attr('title') ||
                     $element.attr('title');
        
        // Try different selectors for rating
        const ratingElement = $element.find('.rating, .score, .imdb, strong, .rate').first();
        const rating = ratingElement.text().trim();
        
        let link = null;
        let id = null;
        
        // Try to find the link and ID
        const allLinks = $element.find('a');
        allLinks.each((_, linkElement) => {
            const href = $(linkElement).attr('href');
            if (href && !href.includes('/genres/') && !href.includes('/category/')) {
                link = href;
                const matches = href.match(/\/(\d+)\/?/) || 
                              href.match(/[/-]([a-zA-Z0-9]+)$/) ||
                              href.match(/movie[/-](\d+)/);
                if (matches && matches[1]) {
                    id = matches[1];
                }
                return false;
            }
        });
        
        if (!id) {
            id = $element.attr('data-id') || 
                 $element.attr('id') || 
                 $element.find('[data-id]').first().attr('data-id');
        }
        
        const year = $element.find('time, .year, .date, .release-date').text().trim();
        const image = $element.find('img').attr('src') || 
                     $element.find('img').attr('data-src') || 
                     $element.find('.poster').attr('style')?.match(/url\(['"]?(.*?)['"]?\)/)?.[1] ||
                     $element.find('[style*="background-image"]').attr('style')?.match(/url\(['"]?(.*?)['"]?\)/)?.[1];
        
        const genres = [];
        $element.find('.genres a, .category a, .categories a, .genre').each((_, genreElement) => {
            const genre = $(genreElement).text().trim();
            if (genre && !genres.includes(genre)) {
                genres.push(genre);
            }
        });

        if (title && (id || link)) {
            const movieData = {
                id: id || link.split('/').filter(Boolean).pop(),
                title,
                rating: rating || 'N/A',
                year: year || 'N/A',
                genres,
                image,
                link: link ? (link.startsWith('http') ? link : `${config.BASE_URL}${link}`) : null
            };

            try {
                Movie.validate(movieData);
                return new Movie(movieData);
            } catch (error) {
                console.error('Invalid movie data:', error.message);
                return null;
            }
        }
        return null;
    }

    isSeries($element) {
        const text = $element.text().toLowerCase();
        const classes = $element.attr('class') || '';
        const hasSeriesIndicators = [
            'سریال',
            'قسمت',
            'فصل',
            'episode',
            'season',
            'series',
            'serial'
        ].some(indicator => text.includes(indicator));
        
        return hasSeriesIndicators || 
               classes.includes('series') || 
               $element.find('.episode-count, .episodes, .seasons').length > 0;
    }

    async getVideoDetails(movieUrl) {
        try {
            const response = await axios.get(movieUrl, { headers: this.headers });
            const $ = cheerio.load(response.data);

            // Get video sources
            const videoSources = [];
            $('video source, iframe[src*="player"], iframe[src*="embed"]').each((_, element) => {
                const src = $(element).attr('src');
                if (src) {
                    videoSources.push({
                        type: element.name === 'iframe' ? 'player' : 'source',
                        url: src,
                        quality: 'unknown'
                    });
                }
            });

            // Get related content
            const relatedContent = [];
            $('.related article, .similar article, [class*="related"] article').each(async (_, element) => {
                const movieInfo = await this.extractMovieInfo($, element);
                if (movieInfo) {
                    const quality = $(element).find('.quality, .resolution, .badge').text().trim();
                    movieInfo.quality = quality || null;
                    relatedContent.push(movieInfo);
                }
            });

            // Get current content info
            const currentContent = {
                title: $('h1, .title').first().text().trim(),
                description: $('.description, .synopsis, .plot, .content p').text().trim(),
                rating: $('.rating, .score, .imdb').first().text().trim(),
                year: $('time, .year, .date').first().text().trim(),
                duration: $('.duration, .runtime').first().text().trim(),
                quality: $('.quality, .resolution').first().text().trim(),
                genres: [],
                cast: [],
                director: $('.director, .directors').text().trim(),
                country: $('.country').text().trim()
            };

            // Get genres
            $('.genres a, .category a').each((_, element) => {
                const genre = $(element).text().trim();
                if (genre && !currentContent.genres.includes(genre)) {
                    currentContent.genres.push(genre);
                }
            });

            // Get cast
            $('.cast a, .actors a').each((_, element) => {
                const actor = $(element).text().trim();
                if (actor && !currentContent.cast.includes(actor)) {
                    currentContent.cast.push(actor);
                }
            });

            return {
                currentContent,
                videoSources,
                relatedContent: relatedContent.slice(0, 12)
            };
        } catch (error) {
            console.error(`Error getting video details from ${movieUrl}:`, error);
            throw new Error(`Failed to fetch video details: ${error.message}`);
        }
    }

    async searchMovies(query) {
        try {
            const response = await axios.get(`${config.BASE_URL}/search/${encodeURIComponent(query)}`, { headers: this.headers });
            const $ = cheerio.load(response.data);
            
            const results = [];
            $('article').each(async (_, element) => {
                const movieInfo = await this.extractMovieInfo($, element);
                if (movieInfo) {
                    const quality = $(element).find('.quality, .resolution, .badge').text().trim();
                    movieInfo.quality = quality || null;
                    results.push(movieInfo);
                }
            });

            return results;
        } catch (error) {
            console.error('Error searching movies:', error);
            throw new Error(`Failed to search movies: ${error.message}`);
        }
    }

    async getCategories() {
        try {
            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            };

            const response = await axios.get(`${config.BASE_URL}/genres/`, { headers });
            const $ = cheerio.load(response.data);

            const categories = [];
            
            // Find category links with updated selectors
            $('.entry-ganers a, .genres a, a[href*="/genres/"]').each((_, element) => {
                const $element = $(element);
                const title = $element.text().trim();
                const link = $element.attr('href');
                
                if (title && link && !link.includes('#') && !categories.some(cat => cat.link === link)) {
                    categories.push({
                        title,
                        link: link.startsWith('http') ? link : `${config.BASE_URL}${link}`,
                        count: 0 // Count will be updated when scraping individual category pages
                    });
                }
            });

            // Remove duplicates
            const uniqueCategories = categories.filter((category, index, self) =>
                index === self.findIndex((c) => c.link === category.link)
            );

            return uniqueCategories;
        } catch (error) {
            console.error('Error getting categories:', error.message);
            throw error;
        }
    }

    async getCategoryContent(categoryUrl) {
        try {
            const response = await axios.get(categoryUrl, { headers: this.headers });
            const $ = cheerio.load(response.data);

            const content = {
                title: $('h1, .page-title, .category-title').first().text().trim(),
                description: $('.category-description, .archive-description').text().trim(),
                items: []
            };

            // Get all movies/series in this category
            $('article, .movie-item, .series-item').each(async (_, element) => {
                const $element = $(element);
                const movieInfo = await this.extractMovieInfo($, element);
                
                if (movieInfo) {
                    // Get additional metadata
                    const quality = $element.find('.quality, .resolution, .badge, .کیفیت').text().trim();
                    const episodes = $element.find('.episodes, .episode-count, .seasons, .قسمت').text().trim();
                    
                    movieInfo.quality = quality || null;
                    if (this.isSeries($element)) {
                        movieInfo.type = 'series';
                        movieInfo.episodes = episodes || null;
                    }
                    
                    content.items.push(movieInfo);
                }
            });

            // Get pagination info if available
            const pagination = {
                currentPage: parseInt($('.current, .active').text()) || 1,
                totalPages: 0
            };

            $('.pagination a, .page-numbers a').each((_, element) => {
                const pageNum = parseInt($(element).text());
                if (!isNaN(pageNum) && pageNum > pagination.totalPages) {
                    pagination.totalPages = pageNum;
                }
            });

            return {
                ...content,
                pagination: pagination.totalPages > 0 ? pagination : null
            };
        } catch (error) {
            console.error(`Error getting category content from ${categoryUrl}:`, error);
            throw new Error(`Failed to fetch category content: ${error.message}`);
        }
    }
}

module.exports = new ScraperService(); 