const Database = require('better-sqlite3');
const { checkAndAddColumn } = require('./utils');

const db = new Database('./movies.db');

// Проверяем и добавляем колонку `poster_url`, если она отсутствует
checkAndAddColumn(db, 'movies', 'poster_url', 'TEXT');

db.close();
console.log('Миграция завершена.');