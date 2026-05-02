/**
 * VietFuel API
 * Copyright (c) 2026 TranQui
 * Github: https://github.com/TranQui004
 * All rights reserved.
 * 
 * This source code is the intellectual property of TranQui.
 * Community contributions and pull requests are highly welcomed!
 */
/**
 * PM2 Process Management Configuration for VietFuelAPI
 * 
 * Usage:
 *   pm2 start ecosystem.config.js
 */

module.exports = {
  apps: [
    {
      name: 'vietfuel-api',
      script: './backend/index.js',
      
      // Auto-restart configuration
      watch: false,
      max_memory_restart: '1G',
      autorestart: true,
      
      // Environment
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 80
      },
      
      // Error handling
      error_file: './backend/logs/pm2-err.log',
      out_file: './backend/logs/pm2-out.log',
      merge_logs: true,
      time: true
    }
  ]
};

