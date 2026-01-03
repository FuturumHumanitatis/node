const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt'); // Для хэширования паролей
const multer = require('multer');
const path = require('path');
const Database = require('better-sqlite3'); // Подключаем better-sqlite3
const app = express();

// Настройка базы данных
const db = new Database('./movies.db');

// Создание или обновление таблиц
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS movies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL UNIQUE,
    year INTEGER,
    director TEXT,
    rating REAL DEFAULT 0,
    watched_date TEXT,
    poster_url TEXT,
    user_id INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    movie_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    review TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(movie_id) REFERENCES movies(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Проверяем, есть ли колонка `user_id` в таблице `movies`
const movieTableInfo = db.prepare(`PRAGMA table_info(movies)`).all();
const hasUserIdColumn = movieTableInfo.some(column => column.name === 'user_id');

if (!hasUserIdColumn) {
  console.log('Колонка `user_id` отсутствует в таблице `movies`. Добавляю...');

  db.exec(`ALTER TABLE movies ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1;`);

  console.log('Колонка `user_id` успешно добавлена!');
}

// Настройка для загрузки постеров
const uploadDir = path.join(__dirname, 'public/uploads');
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadDir));

// Настройка сессий
app.use(
  session({
    secret: 'movie-tracker-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

// Middleware для передачи текущего пользователя в шаблоны
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

// Главная страница — фильмы и статистика
app.get('/', (req, res) => {
  const movies = db
    .prepare(
      `
      SELECT m.*, u.username AS added_by
      FROM movies m
      JOIN users u ON m.user_id = u.id
      ORDER BY m.created_at DESC
    `
    )
    .all();
  const stats = db
    .prepare(
      `
      SELECT COUNT(*) AS total, AVG(rating) AS avg_rating
      FROM movies
    `
    )
    .get();

  res.render('index', { movies, stats: stats || { total: 0, avg_rating: 0 } });
});

// Форма регистрации
app.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('register');
});

// Форма добавления фильма
app.get('/add', (req, res) => {
  // Проверяем, авторизован ли пользователь
  if (!req.session.user) {
    return res.status(403).send('Необходимо войти, чтобы добавить фильм.');
  }

  // Рендерим страницу с формой добавления фильма
  res.render('add-movie');
});

// Обработка регистрации
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hashedPassword);
    res.redirect('/login');
  } catch (err) {
    console.error(err);
    if (err.message.includes('UNIQUE')) {
      res.status(400).send('Пользователь с таким никнеймом уже существует.');
    } else {
      res.status(500).send('Ошибка регистрации.');
    }
  }
});

// Форма входа
app.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('login');
});

// Обработка входа
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user) {
    return res.status(400).send('Неверный логин или пароль.');
  }

  bcrypt.compare(password, user.password, (err, isValid) => {
    if (!isValid) {
      return res.status(400).send('Неверный логин или пароль.');
    }
    req.session.user = { id: user.id, username: user.username };
    res.redirect('/');
  });
});

// Выход из аккаунта
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Добавление фильма
app.post('/add-movie', upload.single('poster'), (req, res) => {
  const { title, year, director, rating, watched_date } = req.body;
  const poster_url = req.file ? `/uploads/${req.file.filename}` : null;
  const user_id = req.session.user.id;

  try {
    db.prepare(
      `
      INSERT INTO movies (title, year, director, rating, watched_date, poster_url, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    ).run(title, year || null, director || null, rating || 0, watched_date || null, poster_url, user_id);
    res.redirect('/');
  } catch (err) {
    console.error(err);
    if (err.message.includes('UNIQUE')) {
      res.status(400).send('Фильм с таким названием уже существует.');
    } else {
      res.status(500).send('Ошибка добавления фильма.');
    }
  }
});

// Детали фильма
app.get('/movie/:id', (req, res) => {
  const { id } = req.params;

  const movie = db
    .prepare(
      `
      SELECT m.*, u.username AS added_by
      FROM movies m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `
    )
    .get(id);

  if (!movie) {
    return res.status(404).send('Фильм не найден.');
  }

  const reviews = db
    .prepare(
      `
      SELECT r.*, u.username AS author
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.movie_id = ?
      ORDER BY r.created_at DESC
    `
    )
    .all(id);

  res.render('movie-detail', { movie, reviews });
});

// Добавление рецензии
app.post('/review/:id', (req, res) => {
  const { id } = req.params;
  const { review } = req.body;
  const user_id = req.session.user.id;

  db.prepare(
    `
    INSERT INTO reviews (movie_id, user_id, review)
    VALUES (?, ?, ?)
  `
  ).run(id, user_id, review);

  res.redirect(`/movie/${id}`);
});

// Запуск сервера
app.listen(3000, () => {
  console.log('Сервер запущен: http://localhost:3000');
});