

import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import connectRabbitMQ from './rabbitmq.js';

const outputParser = new StringOutputParser();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const chatModel = new ChatOpenAI({
  openAIApiKey: OPENAI_API_KEY,
  modelName: "gpt-4-1106-preview"
});

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "Generate a dynamic prompt for another LLM to give a comprehensive summary of the following video transcript. Assess the necessary paragraph count for a detailed summary and instruct the next LLM to follow that count."],
  ["user", "{input}"],
]);

const chain = prompt.pipe(chatModel).pipe(outputParser);

async function generateSummaryPrompt(articleContent) {
    try {
        const chat = await chatModel.invoke(`Here is the transcript:\n\n${articleContent}`);
        return chat.content;
    } catch (error) {
        console.error('Error generating summary prompt:', error);
        throw error;
    }
}

async function processArticleWithLLM(generatedPrompt, articleContent) {
    try {
        const chat = await chatModel.invoke(generatedPrompt + "\n\n" + articleContent);
        
        console.log(chat.content);
        return chat.content;
    } catch (error) {
        console.error('Error processing article with LLM:', error);
        throw error;
    }
}


// New functionality for video summaries
async function generateVideoSummaryPrompt(videoData) {
    try {
        console.log('generating prompt for video summary');
        const inputString = `Title: ${videoData.title}\nDescription: ${videoData.description}\nTranscript: ${videoData.transcript}`;
        const chat = await chatModel.invoke(`Here is the video content please formulate a prompt to help an LLM summarize this video, i have included the transcript title and description:\n\n${inputString}`);
        console.log('generated prompt for video: ', chat.content);
        return chat.content;
    } catch (error) {
        console.error('Error generating video summary prompt:', error);
        throw error;
    }
}

async function processVideoWithLLM(generatedPrompt, videoData) {
    try {
        console.log('processing video with LLM generated prompt');
        const inputString = `here is the video Transcript: ${videoData.transcript}`;
        const chat = await chatModel.invoke(generatedPrompt + "\n\n" + inputString);
        console.log('processed video with LLM: ', chat.content);
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

    console.log("Worker started. Waiting for messages...");

    // Function to handle messages based on queue
    async function handleMessage(message, queue) {
        let data;
        try {
            data = JSON.parse(message.content.toString());
    
            let result;
            if (queue === articleQueue) {
                result = await processArticle(data);
            } else if (queue === videoSummaryQueue) {
         const prompt = await generateVideoSummaryPrompt(data);
         result = await processVideoWithLLM(prompt, data);
            }
    
            // Publish to the success exchange
            const successPayload = JSON.stringify({
                articleId: data.articleId,
                summary: result
            });
            channel.publish(successExchange, '', Buffer.from(successPayload));
    
        } catch (error) {
            console.error(`Error processing message from ${queue}:`, error);
            // Ensure data is defined before accessing its properties
            if (data && data.articleId) {
                const errorPayload = JSON.stringify({
                    articleId: data.articleId,
                    error: error.message
                });
                channel.publish(failureExchange, '', Buffer.from(errorPayload));
            }
        } finally {
            channel.ack(message);
        }
    }

    // Consumer for the articles queue
    channel.consume(articleQueue, (message) => handleMessage(message, articleQueue), { noAck: false });

    // Consumer for the videosummary queue
    channel.consume(videoSummaryQueue, (message) => handleMessage(message, videoSummaryQueue), { noAck: false });
}

startWorker();





// async function startWorker() {
//     const { channel } = await connectRabbitMQ();
//     const queue = 'articles';
//     const successExchange = 'success';
//     const failureExchange = 'failure';

//     await channel.assertQueue(queue, { durable: true });
//     await channel.assertExchange(successExchange, 'fanout', { durable: true });
//     await channel.assertExchange(failureExchange, 'fanout', { durable: true });

//     console.log("Worker started. Waiting for messages...");

//     channel.consume(queue, async (message) => {
//         if (message) {
//             try {
//                 const article = JSON.parse(message.content.toString());
//                 console.log('Processing article:', article);

//                 const promptResponse = await generateSummaryPrompt(article.content);
//                 console.log('Generated Prompt:', promptResponse);

//                 const llmResult = await processArticleWithLLM(promptResponse, article.content);
//                 console.log('LLM Response:', llmResult);

//                 const summary = llmResult;
//                 // Publish a JSON object to the success exchange
//                 const successPayload = JSON.stringify({
//                 articleId: article.articleId,
//                 summary: summary
//                 });
//                 channel.publish(successExchange, '', Buffer.from(successPayload));
//                 channel.ack(message);
//             } catch (error) {
//                 console.error('Error processing article:', error);
//                 const errorPayload = JSON.stringify({
//                     articleId: article.articleId,
//                     error: error.message
//                 });
//                 channel.publish(failureExchange, '', Buffer.from(errorPayload));
//                 channel.ack(message);
//             }
//         }
//     }, { noAck: false });

// }


// startWorker();