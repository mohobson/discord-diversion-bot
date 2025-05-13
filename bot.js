// This bot checks for new commits in the Diversion repository and sends a message to a Discord channel when a new commit is found.
// It uses the Discord.js library to interact with the Discord API and node-fetch to make HTTP requests.
// It also uses dotenv to load environment variables from a .env file.

import 'dotenv/config'; // Load environment variables from .env file
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, Events } from 'discord.js'; // Add `REST`, `Routes`, etc.
import fetch from 'node-fetch';

import http from 'http';
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot is running');
}).listen(process.env.PORT || 3000);

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
    const res = await fetch(DIVERSION_API_URL, {
      headers: {
        Authorization: `Bearer ${DIVERSION_BEARER_TOKEN}`
      }
    });

    if (!res.ok) {
      console.error(`Diversion API Error: ${res.status}`);
      return;
    }

    const commits = await res.json();
    if (commits && commits.length > 0) {
      const latest = commits[0];
      if (latest.id !== lastCommitId) {
        lastCommitId = latest.id;

        const channel = await client.channels.fetch(CHANNEL_ID);
        if (channel) {
          channel.send(`🆕 New commit by **${latest.author}**: ${latest.message}`);
        }
      }
    }
  } catch (err) {
    console.error('Error checking for commits:', err);
  }
}

// ✅ Register slash command once
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // Register /ping command
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

  const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
  ].map(cmd => cmd.toJSON());

  try {
    console.log('⏳ Registering slash command...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log('✅ Slash command registered');
  } catch (error) {
    console.error('❌ Failed to register slash command:', error);
  }

  setInterval(checkForNewCommits, 5 * 60 * 1000); // Poll every 5 minutes
});

// ✅ Respond to the slash command
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ping') {
    await interaction.reply('🏓 Pong!');
  }
});

client.login(DISCORD_TOKEN);
