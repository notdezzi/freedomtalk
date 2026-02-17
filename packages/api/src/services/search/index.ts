// Search service exports
export { SearchService, searchService } from './search.service.js';
export type {
  MessageSearchOptions,
  UserSearchOptions,
  ServerSearchOptions,
  MessageSearchResult,
  UserSearchResult,
  ServerSearchResult,
  AutocompleteResult,
} from './search.service.js';

// Meilisearch client exports
export {
  getMeilisearchClient,
  initializeMeilisearchIndices,
  closeMeilisearch,
  INDICES,
} from './meilisearch.client.js';

// Indexer exports
export { MessageIndexer, messageIndexer } from './indexers/message.indexer.js';
export { UserIndexer, userIndexer } from './indexers/user.indexer.js';
export { ServerIndexer, serverIndexer } from './indexers/server.indexer.js';
