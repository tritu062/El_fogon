module.exports = {
  apps: [
    {
      name: 'elfogon-backend',
      script: 'src/index.js',
      instances: 'max', // Clúster utilizando todos los núcleos del procesador
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000
      }
    }
  ]
};
