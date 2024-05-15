module.exports = {
  apps: [{
    name: 'AI-summarizer-express-app',
    script: 'server.ts',
    interpreter: 'node', // Add this line to specify the Node.js interpreter
    // Options reference: https://pm2.keymetrics.io/docs/usage/application-declaration/
    instances: 1,
    autorestart: true,
    watch: true,
    ignore_watch: ["node_modules"],
    max_memory_restart: '1G',
    max_restarts: 10, // Set the maximum number of restarts
  }],
};