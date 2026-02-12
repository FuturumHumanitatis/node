/**
 * Utility functions for the movie tracker application
 */

/**
 * Checks if a column exists in a table and adds it if missing
 * @param {Object} db - better-sqlite3 database instance
 * @param {string} tableName - Name of the table
 * @param {string} columnName - Name of the column to check/add
 * @param {string} columnDefinition - SQL definition for the column (e.g., 'TEXT', 'INTEGER NOT NULL DEFAULT 1')
 */
function checkAndAddColumn(db, tableName, columnName, columnDefinition) {
  const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const hasColumn = tableInfo.some(column => column.name === columnName);

  if (!hasColumn) {
    console.log(`Колонка \`${columnName}\` отсутствует в таблице \`${tableName}\`. Добавляю...`);
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition};`);
    console.log(`Колонка \`${columnName}\` успешно добавлена!`);
    return true;
  }

  console.log(`Колонка \`${columnName}\` уже существует в таблице \`${tableName}\`.`);
  return false;
}

/**
 * Gets a movie with user information by ID
 * @param {Object} db - better-sqlite3 database instance
 * @param {number|string} movieId - Movie ID
 * @returns {Object|null} Movie object with added_by username or null if not found
 */
function getMovieWithUser(db, movieId) {
  return db
    .prepare(
      `
      SELECT m.*, u.username AS added_by
      FROM movies m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `
    )
    .get(movieId);
}

/**
 * Gets all movies with user information
 * @param {Object} db - better-sqlite3 database instance
 * @returns {Array} Array of movie objects with added_by username
 */
function getAllMoviesWithUsers(db) {
  return db
    .prepare(
      `
      SELECT m.*, u.username AS added_by
      FROM movies m
      JOIN users u ON m.user_id = u.id
      ORDER BY m.created_at DESC
    `
    )
    .all();
}

/**
 * Handles database errors with specific handling for UNIQUE constraint violations
 * @param {Error} err - The error object
 * @param {Object} res - Express response object
 * @param {string} uniqueMessage - Message to send when UNIQUE constraint is violated
 * @param {string} genericMessage - Message to send for other errors
 */
function handleDatabaseError(err, res, uniqueMessage, genericMessage) {
  console.error(err);
  if (err.message.includes('UNIQUE')) {
    res.status(400).send(uniqueMessage);
  } else {
    res.status(500).send(genericMessage);
  }
}

/**
 * Middleware to check if user is authenticated
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(403).send('Необходимо войти, чтобы выполнить это действие.');
  }
  next();
}

module.exports = {
  checkAndAddColumn,
  getMovieWithUser,
  getAllMoviesWithUsers,
  handleDatabaseError,
  requireAuth,
};
