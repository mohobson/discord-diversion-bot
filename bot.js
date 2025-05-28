// This bot checks for new commits in the Diversion repository and sends a message to a Discord channel when a new commit is found.
// It uses the Discord.js library to interact with the Discord API and node-fetch to make HTTP requests.
// It also uses dotenv to load environment variables from a .env file.

import 'dotenv/config'; // Load environment variables from .env file
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, Events } from 'discord.js'; // Add `REST`, `Routes`, etc.
import fetch from 'node-fetch';

import http from 'http';

// Validate required environment variables
const requiredEnvVars = [
  'DISCORD_TOKEN',
  'CHANNEL_ID',
  'DIVERSION_API_URL',
  'DIVERSION_BEARER_TOKEN',
  'CLIENT_ID',
  'GUILD_ID'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Load from .env
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const DIVERSION_API_URL = process.env.DIVERSION_API_URL;
const DIVERSION_BEARER_TOKEN = process.env.DIVERSION_BEARER_TOKEN;

// 🔧 Add your Application ID and Guild ID (for testing in your server)
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

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

  // Register /ping command
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

  const commands = [
    new SlashCommandBuilder()
      .setName('ping')
      .setDescription('Replies with Pong!'),
  ].map(cmd => cmd.toJSON());

  try {
    console.log('⏳ Registering slash command...');
    // First try guild-specific command registration
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    ).catch(async (guildError) => {
      console.log('Guild command registration failed, trying global registration...');
      // If guild registration fails, try global registration
      await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: commands }
      );
    });
    console.log('✅ Slash command registered');
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

// ✅ Respond to the slash command
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ping') {
    await interaction.reply('Pong!');
  }
});

// Add error handling for Discord client
client.on('error', error => {
  console.error('Discord client error:', error);
});

client.on('disconnect', () => {
  console.log('Bot disconnected! Attempting to reconnect...');
  client.login(DISCORD_TOKEN).catch(console.error);
});

client.login(DISCORD_TOKEN);
