# Diversion Discord Bot

A Discord bot designed to notify a Discord channel when new commits are pushed to a Diversion version control repository.

## ⚠️ Project Status

This project is currently on hold as Diversion's server-side APIs are not yet publicly available. The project will resume development once Diversion releases their:
- Server-side API endpoints, or
- Webhook capabilities

## 🤖 Discord Bot Setup

To set up the Discord bot portion (which is ready for integration once Diversion's API becomes available):

1. Go to Discord Developer Portal -> Your Application
2. Go to Installation
   - Install Link -> None
3. Go to Bot
   - Public Bot -> On
   - Requires OAuth2 Code Grant -> Off
   - Presence Intent -> On
   - Server Members Intent -> On
   - Message Content Intent -> On
4. Go to OAuth2 -> URL Generator
5. Select these scopes:
   - bot
   - applications.commands
6. Select these bot permissions:
   - Send Messages
   - View Channels
   - Read Message History
   - Use Slash Commands
7. Copy/paste the Generated URL into browser

## 📦 Planned Features

- Monitor Diversion repository for new commits
- Send commit notifications to a specified Discord channel
- Support for slash commands to check repository status

## 🚀 Technical Setup

### 1. Clone the Repository
```bash
git clone https://github.com/mohobson/discord-diversion-bot.git
cd discord-diversion-bot
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Create a .env file
Create a .env file in the project root. For now, only Discord configuration is needed:
```bash
DISCORD_TOKEN=your_discord_bot_token
CHANNEL_ID=your_discord_channel_id
CLIENT_ID=your_discord_client_id
GUILD_ID=your_discord_guild_id
DIVERSION_BASE_URL=https://api.diversion.dev
DIVERSION_REPO_NAME=ThirdPersonTest
DIVERSION_WORKSPACE=main
```

### 4. Running the bot
```bash
npm start
```

### 5. Project Structure
```bash
diversion-discord-bot/
│
├── bot.js             # Main bot script
├── .env               # Environment variables (not committed)
├── package.json       # Project config and dependencies
├── package-lock.json  # Exact versions of installed packages
├── node_modules/      # Local dependencies (auto-generated)
└── .gitignore        # Files to exclude from version control
```

## 🤝 Contributing

Pull requests are welcome! Please follow these steps:

1. Fork the repository
2. Create a new branch (git checkout -b feature/your-feature)
3. Commit your changes (git commit -am 'Add some feature')
4. Push to the branch (git push origin feature/your-feature)
5. Create a new Pull Request

## 📄 License

MIT -- feel free to use and modify.

