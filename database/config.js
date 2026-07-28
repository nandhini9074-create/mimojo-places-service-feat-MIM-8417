/* eslint-env node */
/* eslint-disable angular/module-getter -- Node/Sequelize config, not Angular */
require("dotenv").config();
exports[process.env.NODE_ENV || "development"] = {
  dialect: process.env.DB_DIALECT,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  host: process.env.DB_HOST,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD
};