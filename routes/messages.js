"use strict";
const express = require("express");
const ExpressError = require("../expressError");
const User = require("../models/user");
const Message = require("../models/message");

const router = express.Router();

/** GET /:id - get detail of message.
 *
 * => {message: {id,
 *               body,
 *               sent_at,
 *               read_at,
 *               from_user: {username, first_name, last_name, phone},
 *               to_user: {username, first_name, last_name, phone}}
 *
 * Make sure that the currently-logged-in users is either the to or from user.
 *
 **/
router.get("/:id", async function (req, res, next) {
  try {
    let message = await Message.get(req.params.id);

    if (
      req.user.username === message.from_user.username ||
      req.user.username === message.to_user.username
    ) {
      return res.json({ message });
    }

    throw new ExpressError("Unauthorized", 401);
  } catch (error) {
    return next(error);
  }
});

/** POST / - post message.
 *
 * {to_username, body} =>
 *   {message: {id, from_username, to_username, body, sent_at}}
 *
 **/
router.post("/", async function (req, res, next) {
  try {
    const { to_username, body } = req.body;
    const from_username = req.user.username;
    const message = await Message.create({ from_username, to_username, body });
    return res.json({ message });
  } catch (error) {
    return next(error);
  }
});

/** POST/:id/read - mark message as read:
 *
 *  => {message: {id, read_at}}
 *
 * Make sure that the only the intended recipient can mark as read.
 *
 **/
router.post("/:id/read", async function (req, res, next) {
  try {
    let message = await Message.get(req.params.id);
    if (req.user.username === message.to_user.username) {
      let message = await Message.markRead(req.params.id);
      return res.json({ message });
    }
    throw new ExpressError("Unauthorized", 401);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
