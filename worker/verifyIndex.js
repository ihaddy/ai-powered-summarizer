import { MeiliSearch } from 'meilisearch';

const meiliClient = new MeiliSearch({
  host: 'http://meilisearch:7700',
  apiKey: process.env.MEILI_MASTER_KEY
});

const indexName = 'videosummaries';

async function verifyIndex() {
  try {
    const index = meiliClient.index(indexName);
    const searchResponse = await index.search('GitHub'); // Replace 'GitHub' with your search term
    console.log(`Indexed documents: ${JSON.stringify(searchResponse.hits, null, 2)}`);
  } catch (error) {
    console.error('Error verifying index:', error);
  }
}

verifyIndex();
