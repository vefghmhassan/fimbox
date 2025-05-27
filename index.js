const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://www.myf2m.com';

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
            const allLinks = $element.find('a');
            allLinks.each((_, linkElement) => {
                const href = $(linkElement).attr('href');
                if (href && !href.includes('/genres/')) {
                    link = href;
                    return false; // break the each loop
                }
            });
            
            const year = $element.find('time').text().trim();
            const genres = [];
            
            $element.find('.genres a').each((_, genreElement) => {
                genres.push($(genreElement).text().trim());
            });
            
            if (title) {
                movies.push({
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
        
        console.log('Found movies with direct links:', moviesWithLinks.length);
        console.log(JSON.stringify(moviesWithLinks, null, 2));

        return moviesWithLinks;
    } catch (error) {
        console.error('Error scraping website:', error.message);
        throw error;
    }
}

// Function to get video details from a specific movie page
async function getVideoDetails(movieUrl) {
    try {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        };

        console.log('Fetching movie page:', movieUrl);
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
                        element: element.name
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
                videoSources.push({
                    type: 'download',
                    url: href,
                    text: $el.text().trim()
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
                        url: data.contentUrl
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
                    videoSources.push({
                        type: 'script',
                        url: url
                    });
                });
            }
        });

        return videoSources;
    } catch (error) {
        console.error(`Error getting video details from ${movieUrl}:`, error.message);
        return [];
    }
}

// Main execution
async function main() {
    try {
        const movies = await scrapeMovies();
        
        // Get video details for movies with direct links
        for (const movie of movies.slice(0, 3)) { // Try first 3 movies with direct links
            if (movie.link) {
                console.log('\nGetting video details for:', movie.title);
                const videoSources = await getVideoDetails(movie.link);
                console.log('Video sources found:', JSON.stringify(videoSources, null, 2));
            }
        }
    } catch (error) {
        console.error('Main execution error:', error.message);
    }
}

main(); 