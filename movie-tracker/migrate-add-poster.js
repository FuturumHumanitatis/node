const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./movies.db');

// Проверяем и добавляем колонку `poster_url`, если она отсутствует
db.serialize(() => {
  db.all("PRAGMA table_info('movies')", (err, rows) => {
    if (err) {
      console.error('Ошибка чтения схемы таблицы:', err);
      db.close();
      return;
    }

    // Проверяем, существует ли колонка `poster_url`
    const hasPosterUrl = rows.some(row => row.name === 'poster_url');

    if (hasPosterUrl) {
      console.log('Колонка `poster_url` уже существует. Ничего не делаю.');
      db.close();
      return;
    }

    // Добавляем колонку `poster_url`, если её нет
    console.log('Добавляю колонку `poster_url` в таблицу `movies`...');
    db.run(`ALTER TABLE movies ADD COLUMN poster_url TEXT`, (err) => {
      if (err) {
        console.error('Ошибка при добавлении колонки:', err);
      } else {
        console.log('Колонка `poster_url` успешно добавлена.');
      }
      db.close();
    });
  });
});