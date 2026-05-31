const mysql = require("mysql2/promise");

const possibleDatabaseUrls = [process.env.DATABASE_URL, process.env.MYSQL_URL].filter(Boolean);
const databaseUrl = possibleDatabaseUrls.find((value) => (
  value.startsWith("mysql://") || value.startsWith("mysql2://")
));

if (!databaseUrl) {
  throw new Error("DATABASE_URL o MYSQL_URL debe ser una URL completa de MySQL, por ejemplo ${{ MySQL.MYSQL_URL }} en Railway.");
}

const pool = mysql.createPool(databaseUrl);

module.exports = {
  pool
};
