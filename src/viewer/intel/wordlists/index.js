'use strict';

const location = require('./location.json');
const economics = require('./economics.json');
const identity = require('./identity.json');
const social = require('./social.json');
const activities = require('./activities.json');
const technical = require('./technical.json');
const criminal = require('./criminal.json');
const physical = require('./physical.json');
const credentials = require('./credentials.json');
const bannable = require('./bannable');
const places = require('./places.json');

module.exports = {
  location,
  economics,
  identity,
  social,
  activities,
  technical,
  criminal,
  physical,
  credentials,
  bannable,
  places,
};
