require("dotenv").config();

const fs = require("fs/promises");
const path = require("path");
const mysql = require("mysql2/promise");

async function migrate() {
  const configuredDatabaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;

  if (!configuredDatabaseUrl) {
    throw new Error("Falta DATABASE_URL o MYSQL_URL. No se puede ejecutar la migracion.");
  }

  if (!configuredDatabaseUrl.startsWith("mysql://") && !configuredDatabaseUrl.startsWith("mysql2://")) {
    throw new Error("DATABASE_URL o MYSQL_URL debe ser una URL completa de MySQL, por ejemplo ${{ MySQL.MYSQL_URL }} en Railway.");
  }

  const databaseUrl = new URL(configuredDatabaseUrl);
  const databaseName = databaseUrl.pathname.replace(/^\//, "");

  if (!/^[a-zA-Z0-9_]+$/.test(databaseName)) {
    throw new Error("El nombre de la base de datos solo puede usar letras, numeros y guion bajo.");
  }

  const sql = await fs.readFile(path.join(__dirname, "schema.sql"), "utf8");
  const setupConnection = await mysql.createConnection({
    host: databaseUrl.hostname,
    port: databaseUrl.port || 3306,
    user: decodeURIComponent(databaseUrl.username),
    password: decodeURIComponent(databaseUrl.password)
  });

  try {
    await setupConnection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
  } finally {
    await setupConnection.end();
  }

  const connection = await mysql.createConnection({
    uri: configuredDatabaseUrl,
    multipleStatements: true
  });

  try {
    await connection.query(sql);
    console.log("Migracion completada.");
  } finally {
    await connection.end();
  }
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
