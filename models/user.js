"use strict";
const db = require("../db");
const ExpressError = require("../expressError");
const bcrypt = require("bcrypt");
const { BCRYPT_WORK_FACTOR } = require("../config.js");

/** User of the site. */

class User {
  /** register new user -- returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({ username, password, first_name, last_name, phone }) {
    const duplicateCheck = await db.query(
      `SELECT username
       FROM users
       WHERE username = $1`,
      [username]
    );

    if (duplicateCheck.rows[0]) {
      throw new ExpressError(`Duplicate username: ${username}`, 400);
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);

    const result = await db.query(
      `INSERT INTO users
       (username,
        password,
        first_name,
        last_name,
        phone,
        join_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING username, password, first_name, last_name, phone`,
      [username, hashedPassword, first_name, last_name, phone]
    );

    const user = result.rows[0];

    return user;
  }

  /** Authenticate: is this username/password valid? Returns boolean. */

  static async authenticate(username, password) {
    // try to find the user first
    const result = await db.query(
      `SELECT username,
              password
           FROM users
           WHERE username = $1`,
      [username]
    );

    const user = result.rows[0];

    if (user) {
      return (await bcrypt.compare(password, user.password)) === true;
    }

    throw new ExpressError("Invalid username/password", 400);
  }

  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {
    await db.query(
      `UPDATE users SET last_login_at = NOW() WHERE username = $1`,
      [username]
    );
  }

  /** All: basic info on all users:
   * [{username, first_name, last_name, phone}, ...] */

  static async all() {
    const result = await db.query(
      `SELECT username,
              first_name,
              last_name,
              phone
       FROM users
       ORDER BY username`
    );

    return result.rows;
  }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) {
    const userRes = await db.query(
      `SELECT username,
              first_name,
              last_name,
              phone,
              last_login_at,
              join_at
       FROM users
       WHERE username = $1`,
      [username]
    );

    const user = userRes.rows[0];

    if (!user) throw new ExpressError(`No user: ${username}`, 404);

    return user;
  }

  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) {
    const result = await db.query(
      `SELECT messages.id,
              users.username AS username,
              users.first_name AS first_name,
              users.last_name AS last_name,
              users.phone AS phone,
              messages.body,
              messages.sent_at,
              messages.read_at
       FROM messages
       JOIN users ON messages.to_username = users.username
       WHERE messages.from_username = $1
       ORDER BY messages.sent_at`,
      [username]
    );

    return result.rows.map((row) => ({
      id: row.id,
      to_user: {
        username: row.username,
        first_name: row.first_name,
        last_name: row.last_name,
        phone: row.phone,
      },
      body: row.body,
      sent_at: row.sent_at,
      read_at: row.read_at,
    }));
  }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesTo(username) {
    const result = await db.query(
      `SELECT messages.id,
              users.username AS username,
              users.first_name AS first_name,
              users.last_name AS last_name,
              users.phone AS phone,
              messages.body,
              messages.sent_at,
              messages.read_at
       FROM messages
       JOIN users ON messages.from_username = users.username
       WHERE messages.to_username = $1
       ORDER BY messages.sent_at`,
      [username]
    );

    return result.rows.map((row) => ({
      id: row.id,
      from_user: {
        username: row.username,
        first_name: row.first_name,
        last_name: row.last_name,
        phone: row.phone,
      },
      body: row.body,
      sent_at: row.sent_at,
      read_at: row.read_at,
    }));
  }
}

module.exports = User;
