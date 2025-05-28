import 'dotenv/config';
import fetch from 'node-fetch';

async function testEndpoint(url, token, format) {
    console.log(`\nTesting with ${format}...`);
    const options = {
        method: 'GET',
        headers: {
            'Authorization': token,
            'Accept': 'application/json'
        }
    };

    try {
        const response = await fetch(url, options);
        const text = await response.text();
        
        console.log('Status:', response.status);
        console.log('Response:', text);
        return response.ok;
    } catch (error) {
        console.error('Error:', error);
        return false;
    }
}

async function testAPI() {
    const rawToken = process.env.DIVERSION_BEARER_TOKEN;
    if (!rawToken) {
        console.error('No token found in environment variables!');
        return;
    }

    console.log('Token length:', rawToken.length);
    console.log('Token starts with:', rawToken.substring(0, 10) + '...');

    const url = 'https://api.diversion.dev/v0/repos';
    
    // Try different token formats
    const formats = [
        {
            name: 'Raw token with Bearer prefix',
            token: `Bearer ${rawToken}`
        },
        {
            name: 'Raw token only',
            token: rawToken
        },
        {
            name: 'Cleaned token with Bearer prefix',
            token: `Bearer ${rawToken.trim().replace(/^["']|["']$/g, '')}`
        },
        {
            name: 'URL-safe token with Bearer prefix',
            token: `Bearer ${encodeURIComponent(rawToken)}`
        }
    ];

    for (const format of formats) {
        await testEndpoint(url, format.token, format.name);
    }
}

console.log('Starting API test...');
console.log('Environment variables:');
console.log('- DIVERSION_REPO_NAME:', process.env.DIVERSION_REPO_NAME);
console.log('- DIVERSION_BASE_URL:', process.env.DIVERSION_BASE_URL || 'https://api.diversion.dev');

testAPI().then(() => console.log('Test complete')); 