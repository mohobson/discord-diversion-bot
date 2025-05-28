# Diversion Discord Bot

A simple Node.js bot that notifies a Discord channel when new commits are pushed to a Diversion version control repository.

## 📦 Features

- Polls the Diversion API at regular intervals (default: every 5 minutes)
- Sends commit messages to a specified Discord channel
- Uses environment variables for easy configuration and security

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/diversion-discord-bot.git
cd diversion-discord-bot
```

### 1. Clone the Repository
```bash
npm install

```

### 2. Install Dependencies
```bash
npm install
```

### 3. Create a .env file
Create a .env file in the project root with the following content:
```bash
DISCORD_TOKEN=your_discord_bot_token
CHANNEL_ID=your_discord_channel_id
DIVERSION_API_URL=https://api.diversion.dev/repos/your_repo/commits
DIVERSION_BEARER_TOKEN=your_diversion_bearer_token
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
└── .gitignore         # Files to exclude from version control
```
### Contributing
Pull requests are welcome! Please follow these steps:

1. Fork the repository

2. Create a new branch (git checkout -b feature/your-feature)

3. Commit your changes (git commit -am 'Add some feature')

4. Push to the branch (git push origin feature/your-feature)

5. Create a new Pull Request

Go to Discord Developer Portal -> Your Application
Go to OAuth2 -> URL Generator
Select these scopes:
bot
applications.commands
Select these bot permissions:
Send Messages
View Channels
Read Message History
Use Slash Commands

### License
MIT -- feel free to use and modify.

