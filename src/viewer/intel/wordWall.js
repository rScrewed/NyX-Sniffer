'use strict';

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'so', 'of', 'to', 'in', 'on', 'at', 'by', 'for', 'with', 'about',
  'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'from', 'up',
  'down', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
  'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
  'only', 'own', 'same', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now', 'is', 'am', 'are', 'was',
  'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'would', 'could',
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves',
  'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their',
  'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'im', 'ive', 'id',
  'ill', 'youre', 'youve', 'youll', 'youd', 'hes', 'shes', 'theyre', 'theyve', 'dont', 'didnt',
  'doesnt', 'isnt', 'arent', 'wasnt', 'werent', 'cant', 'couldnt', 'wouldnt', 'shouldnt', 'wont', 'yeah', 'yea',
  'like', 'get', 'got', 'going', 'go', 'one', 'also', 'really', 'know', 'think', 'see', 'oh', 'ok', 'okay',
  'lol', 'lmao', 'u', 'ur', 'bro', 'yo', 'hey', 'well', 'right', 'still', 'even', 'much', 'many', 'something',
  'nothing', 'anything', 'someone', 'anyone', 'back', 'need', 'want', 'make', 'made', 'let', 'literally',
]);

const MIN_WORD_LENGTH = 3;
const MAX_WORD_LENGTH = 24;

function cleanText(text) {
  return text
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/<a?:\w+:\d+>/g, ' ')
    .replace(/<@!?\d+>|<#\d+>|<@&\d+>/g, ' ')
    .replace(/[`*_~>|]/g, ' ')
    .toLowerCase();
}

function computeWordWall(messages, limit = 70) {
  const counts = new Map();

  for (const message of messages || []) {
    if (!message.content) continue;
    for (const match of cleanText(message.content).match(/[a-z][a-z']{2,}/g) || []) {
      const word = match.replace(/^'+|'+$/g, '');
      if (word.length < MIN_WORD_LENGTH || word.length > MAX_WORD_LENGTH) continue;
      if (STOPWORDS.has(word)) continue;
      counts.set(word, (counts.get(word) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}

module.exports = { computeWordWall };
