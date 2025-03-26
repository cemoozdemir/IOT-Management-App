# Local migration
npx sequelize-cli db:migrate --env development

# Production migration
NODE_ENV=production npx sequelize-cli db:migrate --env production

# Production server start
NODE_ENV=production pm2 restart iot-api --update-env