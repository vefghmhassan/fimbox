const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://www.myf2m.com';

// Helper function to extract movie info
function extractMovieInfo($, element) {
    const $element = $(element);
    
    // Try different selectors for title with broader scope
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
            // Try to extract ID from different URL patterns
            const matches = href.match(/\/(\d+)\/?/) || 
                          href.match(/[/-]([a-zA-Z0-9]+)$/) ||
                          href.match(/movie[/-](\d+)/);
            if (matches && matches[1]) {
                id = matches[1];
            }
            return false;
        }
    });
    
    // If no ID found in URL, try to find it in data attributes or element ID
    if (!id) {
        id = $element.attr('data-id') || 
             $element.attr('id') || 
             $element.find('[data-id]').first().attr('data-id');
    }
    
    // Try different selectors for year
    const year = $element.find('time, .year, .date, .release-date').text().trim();
    
    // Try different approaches for image
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
        return {
            id: id || link.split('/').filter(Boolean).pop(),
            title,
            rating: rating || 'N/A',
            year: year || 'N/A',
            genres,
            image,
            link: link ? (link.startsWith('http') ? link : `${BASE_URL}${link}`) : null
        };
    }
    return null;
}

async function getHomePageData() {
    try {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        };

        console.log('Fetching home page data from:', BASE_URL);
        const response = await axios.get(BASE_URL, { headers });
        const $ = cheerio.load(response.data);

        // Get slider/featured items with expanded selectors
        const sliderItems = [];
        
        // Try multiple approaches to find featured content
        const featuredSelectors = [
            // Direct article selectors
            'div.items article',
            '.slider article',
            '.featured article',
            '.main-slider article',
            '.movie-list article',
            // Parent container selectors
            '.slider-item',
            '.featured-item',
            '.main-slider',
            '.featured',
            '.slider',
            '.swiper-slide',
            // Common slider library selectors
            '.carousel-item',
            '.owl-item',
            // Specific movie selectors in featured areas
            '.featured-movies .movie',
            '.slider-movies .movie',
            '.hero-movies .movie',
            // Generic movie items in featured sections
            '.featured .item',
            '.slider .item',
            '.hero .item'
        ];

        // Try each selector
        featuredSelectors.forEach(selector => {
            $(selector).each((_, element) => {
                const $element = $(element);
                
                // Try to get movie info
                let movieInfo = extractMovieInfo($, element);
                
                // If no movie info found, try to find an article within the element
                if (!movieInfo && $element.find('article').length > 0) {
                    movieInfo = extractMovieInfo($, $element.find('article').first());
                }
                
                if (movieInfo) {
                    // Get additional featured content specific data
                    const description = $element.find('.description, .synopsis, .plot, .content p, .text').text().trim();
                    const quality = $element.find('.quality, .resolution, .badge').text().trim();
                    const duration = $element.find('.duration, .runtime, .time').text().trim();
                    const background = $element.find('.backdrop, .background').attr('style');
                    const backgroundImage = background ? background.match(/url\(['"]?(.*?)['"]?\)/)?.[1] : null;
                    
                    // Add to slider items if not already present
                    const isDuplicate = sliderItems.some(item => item.id === movieInfo.id);
                    if (!isDuplicate) {
                        sliderItems.push({
                            ...movieInfo,
                            isFeatured: true,
                            description: description || null,
                            quality: quality || null,
                            duration: duration || null,
                            backgroundImage: backgroundImage || null
                        });
                    }
                }
            });
        });

        console.log('Found featured items:', sliderItems.length);

        // Initialize sections array
        const sections = [];

        // Get latest movies
        const latestMovies = [];
        $('section.movies article, .latest-movies article, div[class*="movies"] article, .movie-grid article').each((_, element) => {
            const movieInfo = extractMovieInfo($, element);
            if (movieInfo) {
                const quality = $(element).find('.quality, .resolution').text().trim();
                latestMovies.push({
                    ...movieInfo,
                    quality: quality || null
                });
            }
        });
        console.log('Found latest movies:', latestMovies.length);
        if (latestMovies.length > 0) {
            sections.push({
                title: 'Latest Movies',
                type: 'movies',
                items: latestMovies
            });
        }

        // Get latest series
        const latestSeries = [];
        $('section.series article, .latest-series article, div[class*="series"] article, .series-grid article').each((_, element) => {
            const movieInfo = extractMovieInfo($, element);
            if (movieInfo) {
                const episodes = $(element).find('.episodes, .episode-count').text().trim();
                latestSeries.push({
                    ...movieInfo,
                    episodes: episodes || null
                });
            }
        });
        console.log('Found latest series:', latestSeries.length);
        if (latestSeries.length > 0) {
            sections.push({
                title: 'Latest Series',
                type: 'series',
                items: latestSeries
            });
        }

        // Get popular content
        const popularContent = [];
        $('section.popular article, .trending article, div[class*="popular"] article, .most-viewed article').each((_, element) => {
            const movieInfo = extractMovieInfo($, element);
            if (movieInfo) {
                const views = $(element).find('.views, .view-count').text().trim();
                popularContent.push({
                    ...movieInfo,
                    views: views || null
                });
            }
        });
        console.log('Found popular content:', popularContent.length);
        if (popularContent.length > 0) {
            sections.push({
                title: 'Popular Content',
                type: 'mixed',
                items: popularContent
            });
        }

        // Get recommended content
        const recommendedContent = [];
        $('section.recommended article, .suggestions article, div[class*="recommended"] article').each((_, element) => {
            const movieInfo = extractMovieInfo($, element);
            if (movieInfo) {
                recommendedContent.push(movieInfo);
            }
        });
        console.log('Found recommended content:', recommendedContent.length);
        if (recommendedContent.length > 0) {
            sections.push({
                title: 'Recommended For You',
                type: 'mixed',
                items: recommendedContent
            });
        }

        // If no specific sections found, try to get all movies/series
        if (sections.length === 0) {
            console.log('No specific sections found, trying general content...');
            const generalContent = [];
            $('article').each((_, element) => {
                const movieInfo = extractMovieInfo($, element);
                if (movieInfo) {
                    generalContent.push(movieInfo);
                }
            });
            console.log('Found general content:', generalContent.length);
            if (generalContent.length > 0) {
                sections.push({
                    title: 'All Content',
                    type: 'mixed',
                    items: generalContent
                });
            }
        }

        const result = {
            sliderItems,
            sections: sections.filter(section => section.items.length > 0)
        };

        console.log('Final response structure:', {
            featuredCount: result.sliderItems.length,
            sectionsCount: result.sections.length,
            totalItems: result.sections.reduce((acc, section) => acc + section.items.length, 0)
        });

        return result;
    } catch (error) {
        console.error('Error getting home page data:', error);
        throw new Error(`Failed to fetch home page data: ${error.message}`);
    }
}

async function getCategories() {
    try {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        };

        const response = await axios.get(BASE_URL, { headers });
        const $ = cheerio.load(response.data);

        const categories = [];
        
        // Find category links in the menu
        $('.menu-item-object-category, .genres-menu a, .category-list a').each((_, element) => {
            const $element = $(element);
            const title = $element.text().trim();
            const link = $element.attr('href');
            const count = $element.find('.count').text().trim() || '0';
            
            if (title && link && !link.includes('#')) {
                categories.push({
                    title,
                    link: link.startsWith('http') ? link : `${BASE_URL}${link}`,
                    count: parseInt(count.replace(/[^0-9]/g, '') || '0')
                });
            }
        });

        return categories;
    } catch (error) {
        console.error('Error getting categories:', error.message);
        throw error;
    }
}

async function getCategoryContent(categoryUrl) {
    try {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        };

        const response = await axios.get(categoryUrl, { headers });
        const $ = cheerio.load(response.data);

        const items = [];
        $('article').each((_, element) => {
            const movieInfo = extractMovieInfo($, element);
            if (movieInfo) {
                items.push(movieInfo);
            }
        });

        return items;
    } catch (error) {
        console.error(`Error getting category content from ${categoryUrl}:`, error.message);
        throw error;
    }
}

async function scrapeMovies() {
    try {
        // Add headers to mimic a browser request
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
        };

        console.log('Fetching data from website...');
        const response = await axios.get(BASE_URL, { headers });
        const $ = cheerio.load(response.data);

        const movies = [];

        // Find all movie/series entries on the page
        $('article').each((index, element) => {
            const $element = $(element);
            const title = $element.find('h2').text().trim();
            const ratingElement = $element.find('strong').first();
            const rating = ratingElement.text().trim();
            
            // Try to find the actual movie link, not just the genre link
            let link = null;
            let id = null;
            const allLinks = $element.find('a');
            allLinks.each((_, linkElement) => {
                const href = $(linkElement).attr('href');
                if (href && !href.includes('/genres/')) {
                    link = href;
                    // Extract ID from URL
                    const matches = href.match(/\/(\d+)\//);
                    if (matches && matches[1]) {
                        id = matches[1];
                    }
                    return false; // break the each loop
                }
            });
            
            const year = $element.find('time').text().trim();
            const genres = [];
            
            $element.find('.genres a').each((_, genreElement) => {
                genres.push($(genreElement).text().trim());
            });
            
            if (title && id) {
                movies.push({
                    id,
                    title,
                    rating: rating || 'N/A',
                    year: year || 'N/A',
                    genres,
                    link: link ? (link.startsWith('http') ? link : `${BASE_URL}${link}`) : null
                });
            }
        });

        // Filter out movies without direct links
        const moviesWithLinks = movies.filter(movie => movie.link && !movie.link.includes('/genres/'));
        
        return moviesWithLinks;
    } catch (error) {
        console.error('Error scraping website:', error.message);
        throw error;
    }
}

async function getVideoDetails(movieUrl) {
    try {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        };

        console.log('Fetching video details from:', movieUrl);
        const response = await axios.get(movieUrl, { headers });
        const $ = cheerio.load(response.data);

        const videoSources = [];
        
        // Look for common video player elements
        const videoElements = [
            'video',
            'iframe[src*="player"]',
            'iframe[src*="embed"]',
            'iframe[src*="video"]',
            'div[class*="player"]',
            'div[id*="player"]',
            'div[class*="video"]',
            'div[id*="video"]'
        ];

        videoElements.forEach(selector => {
            $(selector).each((_, element) => {
                const $el = $(element);
                const src = $el.attr('src') || $el.data('src') || $el.find('source').attr('src');
                if (src) {
                    videoSources.push({
                        type: 'player',
                        url: src,
                        element: element.name,
                        quality: 'unknown'
                    });
                }
            });
        });

        // Look for download links
        $('a').each((_, element) => {
            const $el = $(element);
            const href = $el.attr('href');
            const text = $el.text().trim().toLowerCase();
            const classes = $el.attr('class') || '';
            
            // Check for download indicators
            if (href && (
                href.includes('.mp4') ||
                href.includes('download') ||
                href.includes('dl.') ||
                text.includes('download') ||
                text.includes('دانلود') ||
                text.includes('پخش') ||
                classes.includes('download') ||
                classes.includes('dl-') ||
                $el.find('img[src*="download"]').length > 0
            )) {
                // Try to determine quality from URL or text
                let quality = 'unknown';
                if (href.includes('1080p') || text.includes('1080')) quality = '1080p';
                else if (href.includes('720p') || text.includes('720')) quality = '720p';
                else if (href.includes('480p') || text.includes('480')) quality = '480p';

                videoSources.push({
                    type: 'download',
                    url: href,
                    text: $el.text().trim(),
                    quality
                });
            }
        });

        // Look for JSON-LD structured data that might contain video information
        $('script[type="application/ld+json"]').each((_, element) => {
            try {
                const data = JSON.parse($(element).html());
                if (data && data['@type'] === 'VideoObject' && data.contentUrl) {
                    videoSources.push({
                        type: 'structured_data',
                        url: data.contentUrl,
                        quality: 'unknown'
                    });
                }
            } catch (e) {
                // Ignore JSON parse errors
            }
        });

        // Look for video URLs in any script tags
        $('script').each((_, element) => {
            const content = $(element).html() || '';
            const urlMatches = content.match(/(https?:\/\/[^"']*\.(?:mp4|m3u8|webm))/g);
            if (urlMatches) {
                urlMatches.forEach(url => {
                    // Try to determine quality from URL
                    let quality = 'unknown';
                    if (url.includes('1080p')) quality = '1080p';
                    else if (url.includes('720p')) quality = '720p';
                    else if (url.includes('480p')) quality = '480p';

                    videoSources.push({
                        type: 'script',
                        url: url,
                        quality
                    });
                });
            }
        });

        // Get related content with expanded selectors
        const relatedContent = [];
        console.log('Searching for related content...');

        // First try: Look for a dedicated related section
        const relatedSection = $('.related-posts, .related-movies, .related, .similar, [class*="related"], .movies-list').first();
        
        if (relatedSection.length > 0) {
            console.log('Found related section:', relatedSection.attr('class'));
            
            // Try to find articles within the section
            relatedSection.find('article, .movie, .item, [class*="movie-item"]').each((_, element) => {
                const movieInfo = extractMovieInfo($, element);
                if (movieInfo) {
                    const quality = $(element).find('.quality, .resolution, .badge, .qual').text().trim();
                    relatedContent.push({
                        ...movieInfo,
                        quality: quality || null
                    });
                }
            });
        }

        // Second try: Look for related items in the main content area
        if (relatedContent.length === 0) {
            console.log('Trying alternative selectors for related content...');
            const alternativeSelectors = [
                // Common related content selectors
                '.related article',
                '.similar article',
                '.suggestions article',
                '.more-posts article',
                // Movie specific selectors
                '.movie-list .item',
                '.movies-list .movie',
                '.movies-grid .item',
                // Generic item selectors in related contexts
                '[class*="related"] .item',
                '[class*="similar"] .item',
                // Persian/RTL specific selectors
                '.فیلم‌های-مرتبط article',
                '.پیشنهادات article',
                // Broader selectors as fallback
                '.movies article',
                '.posts article'
            ];

            alternativeSelectors.forEach(selector => {
                if (relatedContent.length === 0) {
                    $(selector).each((_, element) => {
                        const movieInfo = extractMovieInfo($, element);
                        if (movieInfo) {
                            const quality = $(element).find('.quality, .resolution, .badge, .qual').text().trim();
                            relatedContent.push({
                                ...movieInfo,
                                quality: quality || null
                            });
                        }
                    });
                }
            });
        }

        // Third try: Look for items with similar genres
        if (relatedContent.length === 0) {
            console.log('Trying to find content with similar genres...');
            const currentGenres = [];
            $('.genres a, .category a, .categories a').each((_, element) => {
                currentGenres.push($(element).text().trim().toLowerCase());
            });

            if (currentGenres.length > 0) {
                $('.movies article, .posts article, .movie-list .item').each((_, element) => {
                    const $element = $(element);
                    const elementGenres = [];
                    $element.find('.genres a, .category a, .categories a').each((_, genreElement) => {
                        elementGenres.push($(genreElement).text().trim().toLowerCase());
                    });

                    // Check if there's any genre overlap
                    const hasCommonGenre = elementGenres.some(genre => currentGenres.includes(genre));
                    if (hasCommonGenre) {
                        const movieInfo = extractMovieInfo($, element);
                        if (movieInfo) {
                            const quality = $element.find('.quality, .resolution, .badge, .qual').text().trim();
                            relatedContent.push({
                                ...movieInfo,
                                quality: quality || null
                            });
                        }
                    }
                });
            }
        }

        console.log(`Found ${relatedContent.length} related items`);

        // Get new releases with improved selectors
        const newReleases = {
            movies: [],
            series: []
        };

        // Function to check if content is a series
        const isSeries = ($element) => {
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
        };

        // Get new series with expanded selectors
        console.log('Searching for new series...');
        const seriesSelectors = [
            // Direct series selectors
            '.latest-series article',
            '.new-series article',
            '.series-list article',
            '.series-grid article',
            // Persian specific selectors
            '.سریال‌های-جدید article',
            '.جدیدترین-سریال‌ها article',
            '[class*="series"] article',
            // Common container selectors
            '.series article',
            '.tv-series article',
            // Items within series sections
            'section.series .item',
            'div.series .item',
            '.series-section .item',
            // Generic items that might be series
            '.items article',
            '.posts article'
        ];

        // First try: Look for dedicated series sections
        const seriesSection = $('.series-section, .series-list, .latest-series, [class*="series"]').first();
        if (seriesSection.length > 0) {
            console.log('Found series section:', seriesSection.attr('class'));
            seriesSection.find('article, .item, .movie').each((_, element) => {
                const $element = $(element);
                if (isSeries($element)) {
                    const movieInfo = extractMovieInfo($, element);
                    if (movieInfo) {
                        const episodes = $element.find('.episodes, .episode-count, .seasons, .قسمت').text().trim();
                        const quality = $element.find('.quality, .resolution, .badge, .کیفیت').text().trim();
                        newReleases.series.push({
                            ...movieInfo,
                            episodes: episodes || null,
                            quality: quality || null,
                            type: 'series'
                        });
                    }
                }
            });
        }

        // Second try: Use individual selectors
        if (newReleases.series.length === 0) {
            console.log('Trying alternative series selectors...');
            seriesSelectors.forEach(selector => {
                $(selector).each((_, element) => {
                    const $element = $(element);
                    if (isSeries($element)) {
                        const movieInfo = extractMovieInfo($, element);
                        if (movieInfo) {
                            const episodes = $element.find('.episodes, .episode-count, .seasons, .قسمت').text().trim();
                            const quality = $element.find('.quality, .resolution, .badge, .کیفیت').text().trim();
                            const isDuplicate = newReleases.series.some(item => item.id === movieInfo.id);
                            if (!isDuplicate) {
                                newReleases.series.push({
                                    ...movieInfo,
                                    episodes: episodes || null,
                                    quality: quality || null,
                                    type: 'series'
                                });
                            }
                        }
                    }
                });
            });
        }

        // Third try: Look for series in general content
        if (newReleases.series.length === 0) {
            console.log('Looking for series in general content...');
            $('.items article, .posts article, .movie-list .item').each((_, element) => {
                const $element = $(element);
                if (isSeries($element)) {
                    const movieInfo = extractMovieInfo($, element);
                    if (movieInfo) {
                        const episodes = $element.find('.episodes, .episode-count, .seasons, .قسمت').text().trim();
                        const quality = $element.find('.quality, .resolution, .badge, .کیفیت').text().trim();
                        newReleases.series.push({
                            ...movieInfo,
                            episodes: episodes || null,
                            quality: quality || null,
                            type: 'series'
                        });
                    }
                }
            });
        }

        console.log(`Found ${newReleases.series.length} new series`);

        // Get new movies (existing code)
        // ... existing new movies code ...

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
        $('.genres a, .category a, .categories a').each((_, element) => {
            const genre = $(element).text().trim();
            if (genre && !currentContent.genres.includes(genre)) {
                currentContent.genres.push(genre);
            }
        });

        // Get cast
        $('.cast a, .actors a, .stars a').each((_, element) => {
            const actor = $(element).text().trim();
            if (actor && !currentContent.cast.includes(actor)) {
                currentContent.cast.push(actor);
            }
        });

        return {
            currentContent,
            videoSources,
            relatedContent: relatedContent.slice(0, 12),
            newReleases: {
                movies: newReleases.movies.slice(0, 8),
                series: newReleases.series.slice(0, 8)
            }
        };
    } catch (error) {
        console.error(`Error getting video details from ${movieUrl}:`, error);
        throw new Error(`Failed to fetch video details: ${error.message}`);
    }
}

module.exports = {
    scrapeMovies,
    getVideoDetails,
    getHomePageData,
    getCategories,
    getCategoryContent
}; 