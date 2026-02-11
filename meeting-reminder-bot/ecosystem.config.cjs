module.exports = {
  apps: [{
    name: 'meeting-reminder-bot',
    script: 'dist/index.js',
    cwd: __dirname,
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '200M',
    env: {}
  }]
};
