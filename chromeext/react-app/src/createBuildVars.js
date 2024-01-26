const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envFilePath = path.join(__dirname, '.env');
const buildVarsFilePath = path.join(__dirname, 'buildvars.js');

// Check if .env file exists
if (!fs.existsSync(envFilePath)) {
    console.log('No .env file found at the project root. Creating a default .env file...');
    const defaultEnvContent = 'BASE_URL=http://example.com\nsecuretoken=YourSecureTokenHere\n';
    fs.writeFileSync(envFilePath, defaultEnvContent, 'utf8');
    console.log('Created a default .env file at the project root. Please replace "http://example.com" and "YourSecureTokenHere" with your actual values.');
}

// Load .env file
dotenv.config({ path: envFilePath });

// Create or update buildvars.js
const content = `// buildvars.js
export const BASE_URL = "${process.env.BASE_URL || 'http://default-url.com'}";
export const SECURE_TOKEN = "${process.env.securetoken || 'YourDefaultSecureToken'}";
`;

try {
    fs.writeFileSync(buildVarsFilePath, content, 'utf8');
    console.log('buildvars.js updated with .env variables.');
} catch (error) {
    console.error('Error writing to buildvars.js:', error);
}
