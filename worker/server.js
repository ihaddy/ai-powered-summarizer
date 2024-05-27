import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import connectRabbitMQ from './rabbitmq.js';

const outputParser = new StringOutputParser();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const chatModel = new ChatOpenAI({
  openAIApiKey: OPENAI_API_KEY,
  modelName: "gpt-3.5-turbo-0125"
});

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "Generate a dynamic prompt for another LLM to give a comprehensive summary of the following video transcript. Assess the necessary paragraph count for a detailed summary and instruct the next LLM to follow that count."],
  ["user", "{input}"],
]);

const chain = prompt.pipe(chatModel).pipe(outputParser);

// Logging flag
const enableLogging = true;
// console.log
// const var2 = 1
async function generateSummaryPrompt(articleContent) {
  try {
    if (enableLogging) console.log('Generating summary prompt...');
    const chat = await chatModel.invoke(`Here is the transcript:\n\n${articleContent}`);
    if (enableLogging) console.log('Summary prompt generated.');
    return chat.content;
  } catch (error) {
    console.error('Error generating summary prompt:', error);
    throw error;
  }
}

async function processArticleWithLLM(generatedPrompt, articleContent) {
  try {
    if (enableLogging) console.log('Processing article with LLM...');
    const chat = await chatModel.invoke(generatedPrompt + "\n\n" + articleContent);
    if (enableLogging) console.log('Article processed with LLM.');
    if (enableLogging) console.log('LLM response:', chat.content);
    return chat.content;
  } catch (error) {
    console.error('Error processing article with LLM:', error);
    throw error;
  }
}

// New functionality for video summaries
async function generateVideoSummaryPrompt(videoData) {
  try {
    if (enableLogging) console.log('Generating prompt for video summary...');
    const inputString = `Title: ${videoData.title}\nDescription: ${videoData.description}\nTranscript: ${videoData.transcript}`;
    const chat = await chatModel.invoke(`Here is the video content please formulate a prompt to help an LLM summarize this video, i have included the transcript title and description:\n\n${inputString}`);
    if (enableLogging) console.log('Generated prompt for video:', chat.content);
    return chat.content;
  } catch (error) {
    console.error('Error generating video summary prompt:', error);
    throw error;
  }
}

async function processVideoWithLLM(generatedPrompt, videoData) {
  try {
    if (enableLogging) console.log('Processing video with LLM generated prompt...');
    const inputString = `here is the video Transcript: ${videoData.transcript}`;
    const chat = await chatModel.invoke(generatedPrompt + "\n\n" + inputString);
    if (enableLogging) console.log('Processed video with LLM:', chat.content);
    return chat.content;
  } catch (error) {
    console.error('Error processing video with LLM:', error);
    throw error;
  }
}

async function startWorker() {
  const { channel } = await connectRabbitMQ();
  const articleQueue = 'articles';
  const videoSummaryQueue = 'videosummary';
  const successExchange = 'success';
  const failureExchange = 'failure';

  await channel.assertQueue(articleQueue, { durable: true });
  await channel.assertQueue(videoSummaryQueue, { durable: true });
  await channel.assertExchange(successExchange, 'fanout', { durable: true });
  await channel.assertExchange(failureExchange, 'fanout', { durable: true });

  if (enableLogging) console.log("Worker started. Waiting for messages...");

  // Function to handle messages based on queue
  async function handleMessage(message, queue) {
    let data;
    try {
      data = JSON.parse(message.content.toString());
      if (enableLogging) console.log(`Received message in ${queue} queue:`, data);

      let result;
      if (queue === articleQueue) {
        if (enableLogging) console.log('Processing article...');
        result = await processArticleWithLLM(data);
        if (enableLogging) console.log('Article processed.');
      } else if (queue === videoSummaryQueue) {
        if (enableLogging) console.log('Processing video summary...');
        const prompt = await generateVideoSummaryPrompt(data);
        if (enableLogging) console.log('Video summary prompt generated.');
        result = await processVideoWithLLM(prompt, data);
        if (enableLogging) console.log('Video summary processed.');
      }

      // Include all necessary fields in the successPayload
      const successPayload = JSON.stringify({
        ...data, // Include all original data fields
        summary: result // Add the new result
      });
      if (enableLogging) console.log('Publishing success payload:', successPayload);
      channel.publish(successExchange, '', Buffer.from(successPayload));
      if (enableLogging) console.log('Success payload published.');

    } catch (error) {
      console.error(`Error processing message from ${queue}:`, error);
      // Ensure data is defined before accessing its properties
      if (data && data.articleId) {
        const errorPayload = JSON.stringify({
          articleId: data.articleId,
          error: error.message
        });
        if (enableLogging) console.log('Publishing error payload:', errorPayload);
        channel.publish(failureExchange, '', Buffer.from(errorPayload));
        if (enableLogging) console.log('Error payload published.');
      }
    } finally {
      channel.ack(message);
      if (enableLogging) console.log(`Message acknowledged in ${queue} queue.`);
    }
  }

  // Consumer for the articles queue
  channel.consume(articleQueue, (message) => handleMessage(message, articleQueue), { noAck: false });
  if (enableLogging) console.log('Consumer set up for articles queue.');

  // Consumer for the videosummary queue
  channel.consume(videoSummaryQueue, (message) => handleMessage(message, videoSummaryQueue), { noAck: false });
  if (enableLogging) console.log('Consumer set up for videosummary queue.');
}

startWorker();
