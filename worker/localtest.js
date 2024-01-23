

import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import connectRabbitMQ from './rabbitmq.js';
import {articleText, createJsonPayload} from './converttext.js'

const outputParser = new StringOutputParser();

const openaiApiKey = process.env.OPENAI_API_KEY;

const chatModel = new ChatOpenAI({
  openAIApiKey: openaiApiKey,
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
        return chat.content;
    } catch (error) {
        console.error('Error processing article with LLM:', error);
        throw error;
    }
}


async function startWorkerTest() {
    try {
        // Replace this with your article content
        const articleContent = createJsonPayload(articleText);
        const articleId = '12312312123132'; // Mock article ID for testing

        console.log('Processing article:', articleContent);

        // Generate a prompt for the summary
        const promptResponse = await generateSummaryPrompt(articleContent);
        console.log('Generated Prompt:', promptResponse);

        // Process the article with the generated prompt and the article content
        const llmResult = await processArticleWithLLM(promptResponse, articleContent);
        console.log('LLM Response:', llmResult);

        const summary = llmResult;

        // Display the summary in the console (or handle it as needed)
        console.log('Generated Summary:', summary);

        // Here you can add any additional logic to handle the summary,
        // such as saving it to a database or displaying it in a UI

    } catch (error) {
        console.error('Error processing article:', error);
    }
}

// Call the test function
startWorkerTest();

