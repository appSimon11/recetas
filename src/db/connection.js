const mysql = require("mysql2/promise");

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Falta DATABASE_URL. Revisa tu archivo .env o las variables de Railway.");
}

const pool = mysql.createPool(databaseUrl);

module.exports = {
  pool
};
