const mysql = require("mysql2/promise");

const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;

if (!databaseUrl) {
  throw new Error("Falta DATABASE_URL o MYSQL_URL. Revisa las variables de Railway.");
}

const pool = mysql.createPool(databaseUrl);

module.exports = {
  pool
};
