import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, ".env.production") });


console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("DB_NAME:", process.env.DB_NAME);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_PASS:", process.env.DB_PASS);
