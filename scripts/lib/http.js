'use strict';

const https = require('https');

const MAX_REDIRECTS = 5;

function open(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const redirected = response.statusCode >= 300 && response.statusCode < 400 && response.headers.location;
      if (redirected) {
        response.resume();
        if (redirects >= MAX_REDIRECTS) return reject(new Error('too many redirects for ' + url));
        return resolve(open(response.headers.location, redirects + 1));
      }
      if (response.statusCode !== 200) {
        response.resume();
        return reject(new Error('GET ' + url + ' -> HTTP ' + response.statusCode));
      }
      return resolve(response);
    }).on('error', reject);
  });
}

async function fetchBuffer(url) {
  const response = await open(url);
  const chunks = [];
  for await (const chunk of response) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function fetchText(url) {
  return (await fetchBuffer(url)).toString('utf8');
}

module.exports = { fetchBuffer, fetchText };
