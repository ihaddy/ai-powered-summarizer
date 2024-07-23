import 'dotenv/config';
import * as Sentry from '@sentry/node';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import connectRabbitMQ from './rabbitmq.js';

// Initialize Sentry
const SENTRY_DSN = process.env.SENTRY_DSN;

if (!SENTRY_DSN) {
  throw new Error('SENTRY_DSN is not defined in the environment variables');
}


Sentry.init({
  dsn: SENTRY_DSN,
    integrations: [
      Sentry.captureConsoleIntegration({
        levels: ['log', 'info', 'warn', 'error'], // Capture these log levels as breadcrumbs
      }),
    ],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });

const outputParser = new StringOutputParser();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const chatModel = new ChatOpenAI({
  openAIApiKey: OPENAI_API_KEY,
  modelName: "gpt-4o"
});

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "Generate a dynamic prompt for another LLM to give a comprehensive summary of the following video transcript. This video transcript may be a large json object of timestamped chunks of text of the transcript, if so, please make your summary timestamped as well in increments of 300 seconds. Assess the necessary paragraph count for a detailed summary and instruct the next LLM to follow that count."],
  ["user", "{input}"],
]);

const chain = prompt.pipe(chatModel).pipe(outputParser);

// Logging flag
const enableLogging = true;

function formatTranscriptionWithTimestamps(transcriptionWithTimestamps) {
  if (!transcriptionWithTimestamps || !Array.isArray(transcriptionWithTimestamps)) {
    return ''; // Return empty string if no valid transcription
  }
  return transcriptionWithTimestamps.map(item => {
    if (!item.timestamp || item.timestamp.length !== 2) {
      return item.text; // Return just the text if no valid timestamp
    }
    const [start, end] = item.timestamp;
    return `${item.text} (${start.toFixed(2)} - ${end.toFixed(2)})`;
  }).join(' ');
}

async function generateSummaryPrompt(articleContent) {
  try {
    if (enableLogging) console.log('Generating summary prompt...');
    const chat = await chatModel.invoke(`Here is the transcript:\n\n${articleContent}`);
    if (enableLogging) console.log('Summary prompt generated.');
    return chat.content;
  } catch (error) {
    console.error('Error generating summary prompt:', error);
    Sentry.captureException(error);
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
    Sentry.captureException(error);
    throw error;
  }
}

async function generateVideoSummaryPrompt(videoData) {
  try {
    if (enableLogging) console.log('Generating prompt for video summary...');
    const formattedTranscription = videoData.transcriptionWithTimestamps 
      ? formatTranscriptionWithTimestamps(videoData.transcriptionWithTimestamps)
      : videoData.transcript || '';
    const inputString = `Title: ${videoData.title}\nDescription: ${videoData.description}\nTranscript: ${formattedTranscription}`;
    const chat = await chatModel.invoke(`Here is the video content. ${videoData.transcriptionWithTimestamps ? 'This video content contains timestamps.' : ''} You MUST include instructions in your output to the downstream LLM to summarize the video ${videoData.transcriptionWithTimestamps ? 'in chunks of 300 seconds' : 'comprehensively'}. ${videoData.transcriptionWithTimestamps ? 'It MUST respond with its summary broken up from 0-300, 300-600, etc.' : ''} Now formulate a prompt to help an LLM summarize this video, I have included the transcript, title and description:\n\n${inputString}`);

    if (enableLogging) console.log('Generated prompt for video:', chat.content);
    return chat.content;
  } catch (error) {
    console.error('Error generating video summary prompt:', error);
    Sentry.captureException(error);
    throw error;
  }
}

async function processVideoWithLLM(generatedPrompt, videoData) {
  try {
    if (enableLogging) console.log('Processing video with LLM generated prompt...');
    
    // Format the transcription if available
    const formattedTranscription = videoData.transcriptionWithTimestamps 
      ? formatTranscriptionWithTimestamps(videoData.transcriptionWithTimestamps)
      : '';
    
    // Use the original transcription or fallback to regular transcript for LLM processing
    const inputString = `here is the video Transcript: ${JSON.stringify(videoData.transcriptionWithTimestamps || videoData.transcript)}`;
    const chat = await chatModel.invoke(generatedPrompt + "\n\n" + inputString);
    if (enableLogging) console.log('Processed video with LLM:', chat.content);
    
    // Return both the original and formatted transcriptions along with the summary
    return {
      summary: chat.content,
      transcriptionWithTimestamps: videoData.transcriptionWithTimestamps || null,
      transcriptionWithTimestampsFormatted: formattedTranscription || null,
      transcript: videoData.transcript || null
    };
  } catch (error) {
    console.error('Error processing video with LLM:', error);
    Sentry.captureException(error);
    throw error;
  }
}

async function processChatMessage(chatMessage) {

  // chatmessage onlyhas the key "transcript" for now, so it can either be a transcript with timestamps or a regular
  // transcript for now, so i handle either case.
  try {
    if (enableLogging) console.log('Processing chat message with LLM...');
    if (enableLogging) console.log('chatMessage keys:', Object.keys(chatMessage));

    let formattedTranscription = '';

    if (Array.isArray(chatMessage.transcript)) {
      // Handle case where transcript is an array of objects
      formattedTranscription = formatTranscriptionWithTimestamps(chatMessage.transcript);
      
      if (enableLogging) {
        const sampleTranscript = chatMessage.transcript.slice(0, 2);
        console.log('Sample of raw transcription (first 2 objects):', JSON.stringify(sampleTranscript, null, 2));
      }
    } else if (typeof chatMessage.transcript === 'string') {
      // Handle case where transcript is a string
      formattedTranscription = chatMessage.transcript;
      
      if (enableLogging) {
        console.log('Transcript is a string (first 100 characters):', chatMessage.transcript.substring(0, 100));
      }
    } else {
      console.log('Transcript is neither an array nor a string');
      formattedTranscription = 'No transcript available';
    }

    if (enableLogging) {
      console.log('Formatted transcript (first 100 characters):', formattedTranscription.substring(0, 100));
    }

    const prompt = `You are an AI assistant. Please respond to the following message in the context of the given transcript:\n\nMessage: ${chatMessage.message}\n\nTranscript: ${formattedTranscription}`;

    const chat = await chatModel.invoke(prompt);

    if (enableLogging) console.log('Chat message processed with LLM.');
    if (enableLogging) console.log('LLM response:', chat.content);

    return chat.content;
  } catch (error) {
    console.error('Error processing chat message with LLM:', error);
    Sentry.captureException(error);
    throw error;
  }
}



async function startWorker() {
  try {
    const { channel } = await connectRabbitMQ();
    const articleQueue = 'articles';
    const videoSummaryQueue = 'videosummary';
    const chatProcessingQueue = 'chat-processing-queue';
    const successExchange = 'success';
    const failureExchange = 'failure';
    const chatSuccessExchange = 'chat-success';

    await channel.assertQueue(articleQueue, { durable: true });
    await channel.assertQueue(videoSummaryQueue, { durable: true });
    await channel.assertQueue(chatProcessingQueue, { durable: true });
    await channel.assertExchange(successExchange, 'fanout', { durable: true });
    await channel.assertExchange(failureExchange, 'fanout', { durable: true });
    await channel.assertExchange(chatSuccessExchange, 'fanout', { durable: true });

    if (enableLogging) console.log("Worker started. Waiting for messages...");

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
        } else if (queue === chatProcessingQueue) {
          if (enableLogging) console.log('Processing chat message...');
          result = await processChatMessage(data);
          if (enableLogging) console.log('Chat message processed.');
          
          // Publish chat processing results to the chat-success exchange
          const chatSuccessPayload = JSON.stringify({
            ...data,
            result: result
          });
          if (enableLogging) console.log('Publishing chat success payload:', chatSuccessPayload);
          channel.publish(chatSuccessExchange, '', Buffer.from(chatSuccessPayload));
          if (enableLogging) console.log('Chat success payload published.');
          
          // Return here to avoid publishing to the general success exchange
          channel.ack(message);
          return;
        }

        const successPayload = JSON.stringify({
          ...data,
          ...(queue === videoSummaryQueue
            ? {
                result: result.summary,
                transcriptionWithTimestamps: result.transcriptionWithTimestamps,
                transcriptionWithTimestampsFormatted: result.transcriptionWithTimestampsFormatted,
                transcript: result.transcript
              }
            : { result }
          )
        });
        if (enableLogging) console.log('Publishing success payload:', successPayload);
        channel.publish(successExchange, '', Buffer.from(successPayload));
        if (enableLogging) console.log('Success payload published.');

      } catch (error) {
        console.error(`Error processing message from ${queue}:`, error);
        Sentry.captureException(error);
        if (data && data.articleId) {
          const errorPayload = JSON.stringify({
            articleId: data.articleId,
            error: error.message
          });
          if (enableLogging) console.log('Publishing error payload:', errorPayload);
          channel.publish(failureExchange, '', Buffer.from(errorPayload));
          if (enableLogging) console.log('Error payload published.');
        }
      } 
    }

    channel.consume(articleQueue, (message) => handleMessage(message, articleQueue), { noAck: false });
    if (enableLogging) console.log('Consumer set up for articles queue.');

    channel.consume(videoSummaryQueue, (message) => handleMessage(message, videoSummaryQueue), { noAck: false });
    if (enableLogging) console.log('Consumer set up for videosummary queue.');

    channel.consume(chatProcessingQueue, (message) => handleMessage(message, chatProcessingQueue), { noAck: false });
    if (enableLogging) console.log('Consumer set up for chatProcessingQueue.');
  } catch (error) {
    console.error('Error starting worker:', error);
    Sentry.captureException(error);
    throw error;
  }
}

startWorker();

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  Sentry.captureException(error);
  process.exit(1); // Optional: exit the process after logging the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  Sentry.captureException(reason);
});
