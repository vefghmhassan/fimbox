# FilmBox API & Telegram Bot

A Node.js application that combines a movie scraping API with a Telegram bot interface.

## Features

- Movie website scraping (myf2m.com)
- RESTful API endpoints
- Telegram bot integration
- Real-time movie updates
- Search functionality
- Category browsing

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Telegram Bot Token (from @BotFather)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/api_filmbox.git
cd api_filmbox
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
PORT=3000
```

4. Start the application:
```bash
# Start the API server
npm start

# Start the Telegram bot
npm run bot
```

## API Endpoints

- `GET /api/v1/movies/home` - Get featured movies and latest content
- `GET /api/v1/movies/search?q=query` - Search for movies
- `GET /api/v1/movies/categories` - Get all categories
- `GET /api/v1/movies/category/:id` - Get movies in a category
- `GET /api/v1/movies/:id` - Get movie details

## Telegram Bot Commands

- `/start` - Welcome message and bot introduction
- `/home` - Get featured movies and latest content
- `/search [title]` - Search for movies
- `/categories` - Browse movie categories
- `/help` - Show help message

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License. 