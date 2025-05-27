require('dotenv').config();
const TelegramBotService = require('./services/TelegramBotService');

// Check if bot token is provided
if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN is not set in .env file');
    process.exit(1);
}

// Start the bot
try {
    TelegramBotService.start();
    console.log('🤖 FilmBox Bot is running...');
} catch (error) {
    console.error('❌ Error starting the bot:', error);
    process.exit(1);
} 