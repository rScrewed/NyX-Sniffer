'use strict';

const SEARCH_PAGE_SIZE = 25;
const SEARCH_OFFSET_LIMIT = 9975;
const ATTACHMENT_FILTERS = ['image', 'video', 'file', 'embed', 'sticker', 'sound'];

function buildGuildSearchPath({ guildId, authorId, mentionedId, attachmentFilters, offset, limit = SEARCH_PAGE_SIZE, minId, maxId, order = 'desc', sorted = true }) {
  const params = [];
  if (authorId) params.push('author_id=' + authorId);
  if (mentionedId) params.push('mentions=' + mentionedId);
  if (attachmentFilters) params.push(attachmentFilters.map((filter) => 'has=' + filter).join('&'));
  if (sorted) params.push('sort_by=timestamp', 'sort_order=' + order);
  if (offset !== undefined) params.push('offset=' + offset);
  params.push('limit=' + limit);
  if (minId) params.push('min_id=' + minId);
  if (maxId) params.push('max_id=' + maxId);
  return '/guilds/' + guildId + '/messages/search?' + params.join('&');
}

module.exports = { buildGuildSearchPath, SEARCH_PAGE_SIZE, SEARCH_OFFSET_LIMIT, ATTACHMENT_FILTERS };
