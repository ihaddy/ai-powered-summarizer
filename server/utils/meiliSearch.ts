import { MeiliSearch } from 'meilisearch';

const meiliClient = new MeiliSearch({
  host: 'http://meilisearch:7700', // Update this if your Meilisearch host is different
  apiKey: process.env.MEILI_MASTER_KEY, // Replace with your actual Meilisearch API key
});

const indexName = 'videosummaries'; // Name of the Meilisearch index
const index = meiliClient.index(indexName);

export { meiliClient, index };