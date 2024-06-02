import { MongoClient } from 'mongodb';
import { MeiliSearch } from 'meilisearch';

// MongoDB connection URI and database name
const mongoUri = 'mongodb://mongo:27017/AIsummarizer'; // Update this to your MongoDB connection URI
const dbName = 'AIsummarizer';
const collectionName = 'chats';

// Meilisearch configuration
const meiliClient = new MeiliSearch({
  host: 'http://meilisearch:7700', // Update this if your Meilisearch host is different
  apiKey: process.env.MEILI_MASTER_KEY, // Replace with your actual Meilisearch API key
});
const indexName = 'videosummaries'; // Name of the Meilisearch index

async function fetchDataAndIndex() {
  const mongoClient = new MongoClient(mongoUri);

  try {
    // Connect to MongoDB
    await mongoClient.connect();
    console.log('Connected to MongoDB');
    const db = mongoClient.db(dbName);
    const collection = db.collection(collectionName);

    // Fetch data from MongoDB
    const documents = await collection.find({}).toArray();
    console.log(`Fetched ${documents.length} documents from MongoDB`);

    // Process documents to extract necessary fields
    const processedDocuments = documents.map(doc => {
        // Ensure userId is properly converted to string
        let userId = null;
        if (doc.userId) {
          userId = doc.userId.toHexString();
        }
        console.log('Processing document:', {
          id: doc._id.toString(),
          userId,
          title: doc.title,
          aiMessages: doc.chats.filter(chat => chat.sender === 'ai').map(chat => chat.message)
        });
        return {
          id: doc._id.toString(),
          articleId: doc.articleId,
          userId,
          title: doc.title,
          aiMessages: doc.chats.filter(chat => chat.sender === 'ai').map(chat => chat.message)
        };
      });

    // Check if the index exists, and create it if it doesn't
    let index;
    try {
      index = meiliClient.index(indexName);
      await index.getRawInfo();
      console.log(`Index ${indexName} already exists.`);
    } catch (error) {
      console.log(`Creating index ${indexName}...`);
      await meiliClient.createIndex(indexName, { primaryKey: 'id' });
      index = meiliClient.index(indexName);
    }

    // Update settings to add userId as a filterable attribute and make title and aiMessages searchable
    await index.updateSettings({
      filterableAttributes: ['userId'],
      searchableAttributes: ['title', 'aiMessages']
    });

    // Index data into Meilisearch
    const response = await index.addDocuments(processedDocuments);
    console.log(`Data indexing initiated with response: ${JSON.stringify(response)}`);
  } catch (error) {
    console.error('Error fetching data or indexing:', error);
  } finally {
    // Close MongoDB connection
    await mongoClient.close();
    console.log('MongoDB connection closed');
  }
}

fetchDataAndIndex();
