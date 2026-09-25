'use strict';

function formatUserTag(user) {
  if (!user || !user.username) return null;
  return user.discriminator && user.discriminator !== '0'
    ? user.username + '#' + user.discriminator
    : user.username;
}

function authorTag(message) {
  return message ? formatUserTag(message.author) : null;
}

function isValidUserId(text) {
  return /^\d{15,25}$/.test(text);
}

module.exports = { formatUserTag, authorTag, isValidUserId };
