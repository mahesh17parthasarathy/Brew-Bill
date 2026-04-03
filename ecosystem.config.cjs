module.exports = {
  apps: [{
    name: 'coffee-pos',
    script: 'server.js',
    cwd: '/home/user/webapp/coffee-billing-system',
    watch: false,
    instances: 1,
    exec_mode: 'fork',
    env: { NODE_ENV: 'production', PORT: 3000 }
  }]
};
