const mysql = require("mysql2/promise");

const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;

if (!databaseUrl) {
  throw new Error("Falta DATABASE_URL o MYSQL_URL. Revisa las variables de Railway.");
}

if (!databaseUrl.startsWith("mysql://") && !databaseUrl.startsWith("mysql2://")) {
  throw new Error("DATABASE_URL o MYSQL_URL debe ser una URL completa de MySQL, por ejemplo ${{ MySQL.MYSQL_URL }} en Railway.");
}

const pool = mysql.createPool(databaseUrl);

module.exports = {
  pool
};
