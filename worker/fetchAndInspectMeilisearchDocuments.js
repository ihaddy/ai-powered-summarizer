import { MeiliSearch } from 'meilisearch';

const meiliClient = new MeiliSearch({
  host: 'http://meilisearch:7700',
  apiKey: process.env.MEILI_MASTER_KEY
});

const indexName = 'videosummaries';

async function inspectIndex() {
  try {
    const index = meiliClient.index(indexName);
    const searchResponse = await index.getDocuments({ limit: 100 });
    console.log(`Indexed documents: ${JSON.stringify(searchResponse, null, 2)}`);
  } catch (error) {
    console.error('Error fetching documents from index:', error);
  }
}

inspectIndex();
