// This bot checks for new commits in the Diversion repository and sends a message to a Discord channel when a new commit is found.
// It uses the Discord.js library to interact with the Discord API and node-fetch to make HTTP requests.
// It also uses dotenv to load environment variables from a .env file.

import 'dotenv/config'; // Load environment variables from .env file
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, Events } from 'discord.js'; // Add `REST`, `Routes`, etc.
import fetch from 'node-fetch';
import http from 'http';

// Create HTTP server for Render
const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Discord bot is running!');
  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

// Listen on the port provided by Render or default to 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 HTTP server running on port ${PORT}`);
});

// Validate and format Diversion API URL
const DIVERSION_BASE_URL = process.env.DIVERSION_BASE_URL || 'https://api.diversion.dev';
const DIVERSION_REPO_NAME = process.env.DIVERSION_REPO_NAME;
const DIVERSION_WORKSPACE = process.env.DIVERSION_WORKSPACE || 'main';

// Load Discord configuration
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const DIVERSION_BEARER_TOKEN = process.env.DIVERSION_BEARER_TOKEN;

// Update required environment variables
const requiredEnvVars = [
  'DISCORD_TOKEN',
  'CHANNEL_ID',
  'DIVERSION_BEARER_TOKEN',
  'DIVERSION_REPO_NAME',
  'CLIENT_ID',
  'GUILD_ID'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Construct API URL
const DIVERSION_API_URL = `${DIVERSION_BASE_URL}/v1/repos/${DIVERSION_REPO_NAME}/commits`;

// Log configuration for debugging
console.log('Bot Configuration:');
console.log('Discord Configuration:');
console.log(`Client ID: ${CLIENT_ID}`);
console.log(`Guild ID: ${GUILD_ID}`);
console.log(`Channel ID: ${CHANNEL_ID}`);
console.log('\nDiversion API Configuration:');
console.log(`Base URL: ${DIVERSION_BASE_URL}`);
console.log(`Repository: ${DIVERSION_REPO_NAME}`);
console.log(`Workspace: ${DIVERSION_WORKSPACE}`);
console.log(`Full API URL: ${DIVERSION_API_URL}`);

let lastCommitId = null;

const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
] });

async function checkForNewCommits() {
  try {
    // Add API version and accept headers
    const res = await fetch(DIVERSION_API_URL, {
      headers: {
        'Authorization': `Bearer ${DIVERSION_BEARER_TOKEN}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      console.error(`Diversion API Error: ${res.status} - ${await res.text()}`);
      return;
    }

    const data = await res.json();
    console.log('Diversion API Response:', JSON.stringify(data, null, 2)); // Debug log

    // Handle Diversion's specific response format
    const commits = Array.isArray(data) ? data : data.commits || [];
    if (commits.length > 0) {
      const latest = commits[0];
      
      // Only notify if this is a new commit
      if (latest.id !== lastCommitId) {
        lastCommitId = latest.id;
        
        const channel = await client.channels.fetch(CHANNEL_ID);
        if (channel) {
          // Format the message using Diversion's specific fields
          const commitMessage = `🆕 New commit in Diversion:\n`
            + `Author: **${latest.author_name || latest.author}**\n`
            + `Message: ${latest.commit_message || latest.message}\n`
            + `Branch: ${latest.branch || 'main'}\n`
            + `Workspace: ${latest.workspace || 'N/A'}`;
          
          await channel.send(commitMessage);
        }
      }
    }
  } catch (err) {
    console.error('Error checking for commits:', err);
    // Log detailed error information
    if (err.response) {
      console.error('Response status:', err.response.status);
      console.error('Response data:', err.response.data);
    }
  }
}

// ✅ Register slash command once
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log('Connected to Discord successfully');
  console.log('Watching repository for changes...');

  // Register commands
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

  const commands = [
    new SlashCommandBuilder()
      .setName('ping')
      .setDescription('Replies with Pong!'),
    new SlashCommandBuilder()
      .setName('status')
      .setDescription('Shows the latest commit from Diversion repository'),
  ].map(cmd => cmd.toJSON());

  try {
    console.log('⏳ Registering slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    ).catch(async (guildError) => {
      console.log('Guild command registration failed, trying global registration...');
      await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: commands }
      );
    });
    console.log('✅ Slash commands registered');
  } catch (error) {
    if (error.code === 50001) {
      console.error('❌ Error: Bot lacks permissions to create slash commands.');
      console.error('Please follow these steps to fix permissions:');
      console.error('1. Go to Discord Developer Portal -> Your Application -> OAuth2 -> URL Generator');
      console.error('2. For GUILD INSTALL (recommended), select these scopes:');
      console.error('   - bot');
      console.error('   - applications.commands');
      console.error('3. Under BOT PERMISSIONS, select:');
      console.error('   - Send Messages');
      console.error('   - View Channels');
      console.error('   - Read Message History');
      console.error('4. Copy the URL and use it to add the bot to your server');
      console.error('\nImportant: Use Guild Install instead of User Install');
      console.error('Bot URL Generator: https://discord.com/developers/applications');
    } else {
      console.error('❌ Failed to register slash command:', error);
      console.error('Error details:', error);
    }
  }

  setInterval(checkForNewCommits, 5 * 60 * 1000); // Poll every 5 minutes
});

// Add function to fetch latest commit
async function getLatestCommit() {
  try {
    console.log(`Fetching commits from: ${DIVERSION_API_URL}`);
    const res = await fetch(DIVERSION_API_URL, {
      headers: {
        'Authorization': `Bearer ${DIVERSION_BEARER_TOKEN}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Diversion-Workspace': DIVERSION_WORKSPACE
      }
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Diversion API Error Response:', errorText);
      throw new Error(`Diversion API Error: ${res.status} - ${errorText}`);
    }

    const data = await res.json();
    console.log('Diversion API Response:', JSON.stringify(data, null, 2)); // Debug log

    const commits = Array.isArray(data) ? data : data.commits || [];
    if (commits.length > 0) {
      return commits[0];
    }
    return null;
  } catch (err) {
    console.error('Error fetching latest commit:', err);
    throw err;
  }
}

// Update interaction handler
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  try {
    // Defer the reply immediately to prevent timeout
    await interaction.deferReply();

    if (interaction.commandName === 'ping') {
      try {
        await interaction.editReply('🏓 Pong!');
      } catch (error) {
        if (error.code === 10062) {
          console.log('Interaction expired, ignoring.');
        } else {
          console.error('Error sending ping response:', error);
        }
      }
    } 
    else if (interaction.commandName === 'status') {
      try {
        const latest = await getLatestCommit();
        if (latest) {
          const statusMessage = `📊 Latest Commit Status:\n`
            + `Author: **${latest.author_name || latest.author}**\n`
            + `Message: ${latest.commit_message || latest.message}\n`
            + `Branch: ${latest.branch || 'main'}\n`
            + `Workspace: ${latest.workspace || 'N/A'}\n`
            + `Time: ${new Date(latest.timestamp || latest.date).toLocaleString()}`;
          
          await interaction.editReply(statusMessage);
        } else {
          await interaction.editReply('❌ No commits found in the repository.');
        }
      } catch (error) {
        console.error('Error fetching status:', error);
        await interaction.editReply('❌ Failed to fetch repository status. Check the logs for details.');
      }
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    // Try to send an error message if we can
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'There was an error processing your command!', ephemeral: true });
      } else {
        await interaction.editReply({ content: 'There was an error processing your command!' });
      }
    } catch (followUpError) {
      console.error('Error sending error message:', followUpError);
    }
  }
});

// Add error handling for Discord client
client.on('error', error => {
  console.error('Discord client error:', error);
  // Attempt to reconnect if it's a connection error
  if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
    console.log('Attempting to reconnect...');
    client.login(DISCORD_TOKEN).catch(console.error);
  }
});

client.on('disconnect', () => {
  console.log('Bot disconnected! Attempting to reconnect...');
  client.login(DISCORD_TOKEN).catch(console.error);
});

client.login(DISCORD_TOKEN);
