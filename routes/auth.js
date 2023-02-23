"use strict";
const express = require("express");
const ExpressError = require("../expressError");
const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");
const router = express.Router();

/** POST /login - login: {username, password} => {token}
 *
 * Make sure to update their last-login!
 *
 **/
router.post("/login", async function (req, res, next) {
  try {
    const { username, password } = req.body;
    const result = await User.authenticate(username, password);

    if (result) {
      let token = jwt.sign({ username }, SECRET_KEY);
      await User.updateLoginTimestamp(username);
      return res.json({ token });
    }

    throw new ExpressError("Invalid username/password", 400);
  } catch (error) {
    return next(error);
  }
});

/** POST /register - register user: registers, logs in, and returns token.
 *
 * {username, password, first_name, last_name, phone} => {token}.
 *
 *  Make sure to update their last-login!
 */
router.post("/register", async function (req, res, next) {
  try {
    let user = User.register(req.body);
    let token = jwt.sign(user.username, SECRET_KEY);
    User.updateLoginTimestamp(user.username);
    return res.json({token});
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
