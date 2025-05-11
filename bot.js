// This bot checks for new commits in the Diversion repository and sends a message to a Discord channel when a new commit is found.
// It uses the Discord.js library to interact with the Discord API and node-fetch to make HTTP requests.
// It also uses dotenv to load environment variables from a .env file.

import 'dotenv/config'; // Load environment variables from .env file
import { Client, GatewayIntentBits } from 'discord.js';
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

let lastCommitId = null;

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

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

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  setInterval(checkForNewCommits, 5 * 60 * 1000); // Poll every 5 minutes
});

client.login(DISCORD_TOKEN);
