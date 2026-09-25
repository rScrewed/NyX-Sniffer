'use strict';

const SECTIONS = [
  require('./underage.json'),
  require('./childSafety.json'),
  require('./selfbotsAndTokenTheft.json'),
  require('./phishingAndScams.json'),
  require('./accountTrading.json'),
  require('./harassmentAndThreats.json'),
  require('./doxxingAndSwatting.json'),
  require('./hateAndExtremism.json'),
  require('./selfHarm.json'),
  require('./illegalGoods.json'),
  require('./financialScams.json'),
  require('./adultAndGore.json'),
  require('./raidsAndBrigading.json'),
  require('./banEvasion.json'),
  require('./cheatsAndPiracy.json'),
];

module.exports = SECTIONS.flat();
