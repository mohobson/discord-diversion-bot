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
const DIVERSION_ORG = process.env.DIVERSION_ORG; // Add organization name

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
  'DIVERSION_ORG', // Make organization required
  'CLIENT_ID',
  'GUILD_ID'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Construct API URL (updated to match documentation)
const DIVERSION_API_URL = `${DIVERSION_BASE_URL}/v0/repos/${DIVERSION_REPO_NAME}/commits`;

// Log configuration for debugging
console.log('Bot Configuration:');
console.log('Discord Configuration:');
console.log(`Client ID: ${CLIENT_ID}`);
console.log(`Guild ID: ${GUILD_ID}`);
console.log(`Channel ID: ${CHANNEL_ID}`);
console.log('\nDiversion API Configuration:');
console.log(`Base URL: ${DIVERSION_BASE_URL}`);
console.log(`Organization: ${DIVERSION_ORG}`);
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
    new SlashCommandBuilder()
      .setName('test')
      .setDescription('Test the Diversion API connection'),
  ].map(cmd => cmd.toJSON());

  try {
    // Register commands globally (may take up to an hour to propagate)
    console.log('⏳ Registering commands globally...');
    const globalData = await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );
    
    console.log('✅ Commands registered globally. They may take up to an hour to appear.');
    console.log('Registered commands:', globalData.map(cmd => ({
      name: cmd.name,
      id: cmd.id,
      description: cmd.description
    })));

    // Try to fetch global commands to verify
    try {
      const registeredCommands = await rest.get(
        Routes.applicationCommands(CLIENT_ID)
      );
      console.log('\nVerifying global commands:');
      registeredCommands.forEach(cmd => {
        console.log(`- /${cmd.name}: ${cmd.description} (ID: ${cmd.id})`);
      });
    } catch (error) {
      console.log('Note: Could not verify commands, but they may still be registered correctly.');
    }

    console.log('\n⚠️ Commands are registered but may take up to an hour to appear in Discord.');
    console.log('You can check the commands by typing / in your server.');
  } catch (error) {
    console.error('❌ Failed to register commands:', error);
    if (error.code === 50001) {
      console.error('\nPermission Error: Please check bot permissions');
      console.error('1. Go to Discord Developer Portal -> OAuth2 -> URL Generator');
      console.error('2. Select these scopes:');
      console.error('   - bot');
      console.error('   - applications.commands');
      console.error('3. Select permissions:');
      console.error('   - Send Messages');
      console.error('   - View Channels');
      console.error('4. Use the generated URL to reinvite the bot');
    }
  }

  // Start the commit checking interval
  console.log('\n📡 Starting commit monitoring...');
  setInterval(checkForNewCommits, 5 * 60 * 1000); // Poll every 5 minutes
});

// Add function to validate and clean bearer token
function cleanBearerToken(token) {
  if (!token) return null;
  // Remove any whitespace and quotes
  token = token.trim().replace(/^["']|["']$/g, '');
  // Remove 'Bearer ' prefix if present
  token = token.replace(/^Bearer\s+/i, '');
  return token;
}

async function getLatestCommit() {
  try {
    console.log('Fetching commits from:', DIVERSION_API_URL);
    
    const token = cleanBearerToken(DIVERSION_BEARER_TOKEN);
    if (!token) {
      throw new Error('Bearer token is missing or invalid');
    }

    // Log headers for debugging (without the actual token)
    console.log('Request headers:', {
      Authorization: 'Bearer [TOKEN]',
      Accept: 'application/json',
      'Content-Type': 'application/json'
    });

    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };

    const res = await fetch(DIVERSION_API_URL, options);
    const responseText = await res.text(); // Get raw response text first

    console.log('Response status:', res.status);
    console.log('Response headers:', Object.fromEntries(res.headers.entries()));
    console.log('Raw response:', responseText);

    if (!res.ok) {
      throw new Error(`Diversion API Error: ${res.status} - ${responseText}`);
    }

    // Try to parse the response as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Failed to parse response as JSON: ${responseText}`);
    }

    console.log('Parsed response:', JSON.stringify(data, null, 2));

    // Handle both array and object responses
    const commits = Array.isArray(data) ? data : data.commits || [];
    if (commits.length > 0) {
      return commits[0];
    }
    
    console.log('No commits found in repository');
    return null;
  } catch (err) {
    console.error('Error in getLatestCommit:', err);
    throw err;
  }
}

// Update testDiversionAPI function with similar improvements
async function testDiversionAPI() {
  try {
    console.log('Testing Diversion API connection...');
    
    const token = cleanBearerToken(DIVERSION_BEARER_TOKEN);
    if (!token) {
      throw new Error('Bearer token is missing or invalid');
    }

    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };

    // First try listing repositories
    console.log('Testing /v0/repos endpoint...');
    const reposRes = await fetch('https://api.diversion.dev/v0/repos', options);
    const reposText = await reposRes.text();
    
    console.log('Repos response status:', reposRes.status);
    console.log('Repos raw response:', reposText);

    if (!reposRes.ok) {
      throw new Error(`Failed to list repositories: ${reposRes.status} - ${reposText}`);
    }

    const repos = JSON.parse(reposText);
    
    // Then try accessing the specific repository
    console.log('Testing specific repository endpoint:', DIVERSION_API_URL);
    const repoRes = await fetch(DIVERSION_API_URL, options);
    const repoText = await repoRes.text();

    console.log('Repository response status:', repoRes.status);
    console.log('Repository raw response:', repoText);

    if (!repoRes.ok) {
      throw new Error(`Failed to access repository: ${repoRes.status} - ${repoText}`);
    }

    const commits = JSON.parse(repoText);

    return {
      success: true,
      repos: repos,
      commits: commits,
      message: 'API connection successful'
    };
  } catch (err) {
    console.error('API test failed:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

// Update interaction handler
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  try {
    // For status command, defer reply first before making API calls
    if (interaction.commandName === 'status' || interaction.commandName === 'test') {
      await interaction.deferReply().catch(error => {
        console.warn('Failed to defer reply:', error);
        return; // Continue execution even if defer fails
      });
    }

    switch (interaction.commandName) {
      case 'ping':
        await interaction.reply('🏓 Pong!').catch(error => {
          console.warn('Failed to send ping response:', error);
        });
        break;

      case 'status':
        try {
          const latest = await getLatestCommit();
          if (latest) {
            const statusMessage = `📊 Latest Commit Status:\n`
              + `Author: **${latest.author_name || latest.author}**\n`
              + `Message: ${latest.commit_message || latest.message}\n`
              + `Branch: ${latest.branch || 'main'}\n`
              + `Time: ${new Date(latest.timestamp || latest.date).toLocaleString()}`;
            
            if (interaction.deferred) {
              await interaction.editReply(statusMessage).catch(error => {
                console.warn('Failed to edit reply:', error);
              });
            } else {
              await interaction.reply(statusMessage).catch(error => {
                console.warn('Failed to send reply:', error);
              });
            }
          } else {
            const response = '❌ No commits found in the repository.';
            if (interaction.deferred) {
              await interaction.editReply(response).catch(console.warn);
            } else {
              await interaction.reply(response).catch(console.warn);
            }
          }
        } catch (error) {
          console.error('Error fetching status:', error);
          const errorMsg = '❌ Failed to fetch repository status. Check the logs for details.';
          if (interaction.deferred) {
            await interaction.editReply(errorMsg).catch(console.warn);
          } else {
            await interaction.reply(errorMsg).catch(console.warn);
          }
        }
        break;

      case 'test':
        try {
          const result = await testDiversionAPI();
          const response = result.success
            ? `✅ API Connection Test Successful!\n\nAvailable repositories:\n${result.repos.map(r => `- ${r.name}`).join('\n')}`
            : `❌ API Connection Test Failed:\n${result.error}`;

          if (interaction.deferred) {
            await interaction.editReply(response).catch(console.warn);
          } else {
            await interaction.reply(response).catch(console.warn);
          }
        } catch (error) {
          console.error('Error running API test:', error);
          const errorMsg = '❌ Failed to test API connection. Check the logs for details.';
          if (interaction.deferred) {
            await interaction.editReply(errorMsg).catch(console.warn);
          } else {
            await interaction.reply(errorMsg).catch(console.warn);
          }
        }
        break;
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    const errorMsg = { 
      content: 'There was an error processing your command!',
      flags: 1 << 6 // Use flags instead of ephemeral property
    };
    
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply(errorMsg);
      } else if (interaction.deferred) {
        await interaction.editReply(errorMsg);
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
