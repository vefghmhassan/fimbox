const TelegramBot = require('node-telegram-bot-api');
const ScraperService = require('./ScraperService');
require('dotenv').config();

class TelegramBotService {
    constructor() {
        this.token = process.env.TELEGRAM_BOT_TOKEN;
        this.bot = new TelegramBot(this.token, {
            polling: {
                interval: 1000,
                autoStart: true,
                params: {
                    timeout: 30
                }
            },
            request: {
                proxy: false,
                timeout: 30000,
                agent: null,
                forever: true,
                retries: 3
            }
        });
        this.setupCommands();
        this.setupErrorHandlers();
    }

    setupErrorHandlers() {
        // Handle polling errors
        this.bot.on('polling_error', (error) => {
            console.error('Polling error:', error.message);
            // Restart polling after error
            setTimeout(() => {
                console.log('Attempting to restart polling...');
                this.bot.startPolling();
            }, 5000);
        });

        // Handle webhook errors
        this.bot.on('webhook_error', (error) => {
            console.error('Webhook error:', error.message);
        });

        // Handle general errors
        this.bot.on('error', (error) => {
            console.error('Bot error:', error.message);
        });
    }

    start() {
        try {
            console.log('🤖 Telegram bot is starting...');
            this.bot.startPolling();
            console.log('✅ Telegram bot is running!');
        } catch (error) {
            console.error('❌ Failed to start bot:', error.message);
            process.exit(1);
        }
    }

    setupCommands() {
        // Start command
        this.bot.onText(/\/start/, (msg) => {
            const chatId = msg.chat.id;
            const message = `Welcome to FilmBox Bot! 🎬\n\nAvailable commands:\n
/home - Get featured movies and latest content
/search [title] - Search for movies
/categories - View all categories
/help - Show this help message`;
            
            this.bot.sendMessage(chatId, message, {
                parse_mode: 'HTML',
                reply_markup: {
                    keyboard: [
                        ['🏠 Home', '🔍 Search'],
                        ['📂 Categories', '❓ Help']
                    ],
                    resize_keyboard: true
                }
            });
        });

        // Home command
        this.bot.onText(/\/home|🏠 Home/, async (msg) => {
            const chatId = msg.chat.id;
            try {
                const homeData = await ScraperService.getHomePageData();
                
                // Send featured content
                if (homeData.featured && homeData.featured.items.length > 0) {
                    await this.bot.sendMessage(chatId, '🌟 Featured Content:');
                    for (const movie of homeData.featured.items.slice(0, 5)) {
                        const message = this.formatMovieMessage(movie);
                        await this.bot.sendMessage(chatId, message, {
                            parse_mode: 'HTML',
                            reply_markup: {
                                inline_keyboard: [[
                                    { text: '🎬 Watch Now', url: movie.link }
                                ]]
                            }
                        });
                    }
                }

                // Send sections
                if (homeData.sections) {
                    for (const section of homeData.sections) {
                        if (section.items.length > 0) {
                            await this.bot.sendMessage(chatId, `\n📺 ${section.title}:`);
                            for (const movie of section.items.slice(0, 3)) {
                                const message = this.formatMovieMessage(movie);
                                await this.bot.sendMessage(chatId, message, {
                                    parse_mode: 'HTML',
                                    reply_markup: {
                                        inline_keyboard: [[
                                            { text: '🎬 Watch Now', url: movie.link }
                                        ]]
                                    }
                                });
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching home data:', error);
                this.bot.sendMessage(chatId, '❌ Sorry, there was an error fetching the content. Please try again later.');
            }
        });

        // Search command
        this.bot.onText(/\/search|🔍 Search/, (msg) => {
            const chatId = msg.chat.id;
            this.bot.sendMessage(chatId, 'Please enter the movie title you want to search for:', {
                reply_markup: {
                    force_reply: true
                }
            });
        });

        // Handle search query
        this.bot.on('message', async (msg) => {
            if (msg.reply_to_message && msg.reply_to_message.text === 'Please enter the movie title you want to search for:') {
                const chatId = msg.chat.id;
                const searchQuery = msg.text;

                try {
                    const results = await ScraperService.searchMovies(searchQuery);
                    if (results.length > 0) {
                        await this.bot.sendMessage(chatId, `🔍 Search results for "${searchQuery}":`);
                        for (const movie of results.slice(0, 5)) {
                            const message = this.formatMovieMessage(movie);
                            await this.bot.sendMessage(chatId, message, {
                                parse_mode: 'HTML',
                                reply_markup: {
                                    inline_keyboard: [[
                                        { text: '🎬 Watch Now', url: movie.link }
                                    ]]
                                }
                            });
                        }
                    } else {
                        await this.bot.sendMessage(chatId, '❌ No results found. Please try a different search term.');
                    }
                } catch (error) {
                    console.error('Error searching movies:', error);
                    await this.bot.sendMessage(chatId, '❌ Sorry, there was an error searching for movies. Please try again later.');
                }
            }
        });

        // Categories command
        this.bot.onText(/\/categories|📂 Categories/, async (msg) => {
            const chatId = msg.chat.id;
            try {
                const categories = await ScraperService.getCategories();
                if (categories.length > 0) {
                    const categoryButtons = categories.map(category => ({
                        text: category.title,
                        callback_data: `category:${category.link}`
                    }));

                    const keyboard = [];
                    for (let i = 0; i < categoryButtons.length; i += 2) {
                        keyboard.push(categoryButtons.slice(i, i + 2));
                    }

                    await this.bot.sendMessage(chatId, '📂 Available Categories:', {
                        reply_markup: {
                            inline_keyboard: keyboard
                        }
                    });
                } else {
                    await this.bot.sendMessage(chatId, '❌ No categories found.');
                }
            } catch (error) {
                console.error('Error fetching categories:', error);
                await this.bot.sendMessage(chatId, '❌ Sorry, there was an error fetching categories. Please try again later.');
            }
        });

        // Handle category selection
        this.bot.on('callback_query', async (callbackQuery) => {
            const chatId = callbackQuery.message.chat.id;
            const data = callbackQuery.data;

            if (data.startsWith('category:')) {
                const categoryUrl = data.split(':')[1];
                try {
                    const categoryContent = await ScraperService.getCategoryContent(categoryUrl);
                    if (categoryContent.items.length > 0) {
                        await this.bot.sendMessage(chatId, `📂 ${categoryContent.title}:`);
                        for (const movie of categoryContent.items.slice(0, 5)) {
                            const message = this.formatMovieMessage(movie);
                            await this.bot.sendMessage(chatId, message, {
                                parse_mode: 'HTML',
                                reply_markup: {
                                    inline_keyboard: [[
                                        { text: '🎬 Watch Now', url: movie.link }
                                    ]]
                                }
                            });
                        }
                    } else {
                        await this.bot.sendMessage(chatId, '❌ No content found in this category.');
                    }
                } catch (error) {
                    console.error('Error fetching category content:', error);
                    await this.bot.sendMessage(chatId, '❌ Sorry, there was an error fetching category content. Please try again later.');
                }
            }
        });

        // Help command
        this.bot.onText(/\/help|❓ Help/, (msg) => {
            const chatId = msg.chat.id;
            const message = `FilmBox Bot Help 🎬\n\nAvailable commands:\n
/home - Get featured movies and latest content
/search [title] - Search for movies
/categories - View all categories
/help - Show this help message\n
You can also use the keyboard buttons below for easy navigation.`;
            
            this.bot.sendMessage(chatId, message);
        });
    }

    formatMovieMessage(movie) {
        return `<b>${movie.title}</b>\n
${movie.year ? `📅 Year: ${movie.year}` : ''}
${movie.rating ? `⭐️ Rating: ${movie.rating}` : ''}
${movie.genres && movie.genres.length > 0 ? `🎭 Genres: ${movie.genres.join(', ')}` : ''}`;
    }
}

module.exports = new TelegramBotService(); 