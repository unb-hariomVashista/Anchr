module.exports = {
  apps: [
    {
      name: "anchr-mrp-discounter",
      script: "node_modules/.bin/react-router-serve",
      args: "./build/server/index.js",
      cwd: "/mnt/app_extend_storage/apps/anchr",
      instances: 1, // Keep 1 for SQLite database safety
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 3004,
      },
    },
  ],
};
