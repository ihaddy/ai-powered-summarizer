import express, { Response, Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import connectRabbitMQ from '../utils/rabbitmq';
import { sseEmitter } from '../utils/subscriber';
import Chat from '../models/chatModel';
import verifyJWT from '../utils/verifyJWT';
import logger from '../utils/logger';
import { Request } from '../customTypes/request'; // Ensure you are importing your custom type

const router: Router = express.Router();

router.post('/summarize', verifyJWT, async (req: Request, res: Response) => {
    const userId: string = req.user.userId; // Access userId from req.user
    const userEmail: string = req.user.email; // Access email from req.user
    console.log('POST /summarize - Request received:', req.body);
    const article: any = req.body;
    const articleId: string = uuidv4(); 

    try {
        // Add userId to the initialChatObject
        const initialChatObject = new Chat({ userId: userId, articleId: articleId, chats: [] });
        console.log(`Inserting initial chat object for userId: ${userId}, articleId: ${articleId}`);
        await initialChatObject.save();

        console.log('Connecting to RabbitMQ and sending message to queue');
        const { channel } = await connectRabbitMQ();
        const queue: string = 'articles';
        await channel.assertQueue(queue, { durable: true });
        // Include userId in the message sent to the queue
        channel.sendToQueue(queue, Buffer.from(JSON.stringify({ userId, userEmail, articleId, ...article })));

        res.status(200).send({ articleId: articleId });
    } catch (error) {
        console.error('POST /summarize - Error:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

router.get('/summary_stream/:articleId', verifyJWT, (req: Request, res: Response) => {
    const userId: string = req.user.userId; // Access userId from req.user
    const userEmail: string = req.user.email; // Access email from req.user
    console.log(`GET /summary_stream/${req.params.articleId} - SSE connection opened`);
    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });

    const onNewSummary = (data: any) => {
        // Ensure that the summary is for the right user
        if (data.articleId === req.params.articleId && data.userId === userId) {
            console.log(`SSE - New summary for userId: ${userId}, articleId: ${req.params.articleId}`);
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        }
    };

    sseEmitter.on('newSummary', onNewSummary);

    (req as any).on('close', () => {
        console.log(`SSE connection closed for userId: ${userId}, articleId: ${req.params.articleId}`);
        sseEmitter.removeListener('newSummary', onNewSummary);
    });
});

router.get('/articles', verifyJWT, async (req: Request, res: Response) => {
    console.log('token req: ', req.user)
    const userId: string = req.user.userId; // Access userId from req.user
    const userEmail: string = req.user.email; // Access email from req.user
    console.log(`GET /articles - Request received to retrieve all article IDs for userId: ${userId}`);
    try {
        // Query for articles related to the specific user
        console.log(`Querying MongoDB for all article IDs for userId: ${userId}`);
        const chatLogs = await Chat.find({ userId: userId }, 'articleId');
        const articleIds: string[] = chatLogs.map((chat: any) => chat.articleId);
        console.log('Successfully retrieved article IDs for user');
        res.status(200).json(articleIds);
    } catch (error) {
        console.error('GET /articles - Error:', error);
        res.status(500).send({ error: error.message });
    }
});

router.get('/article-titles', verifyJWT, async (req: Request, res: Response) => {
    const userId: string = req.user.userId;
    const page: number = parseInt(req.query.page as string) || 1; // Get the 'page' query parameter, default to 1
    const limit: number = 10; // Number of articles per page

    try {
        const skip: number = (page - 1) * limit; // Calculate the number of articles to skip based on the page number

        const query: any = { userId: userId };
        const totalCount: number = await Chat.countDocuments(query); // Get the total count of articles for the user

        const articles: any[] = await Chat.find(query, 'articleId title')
            .sort({ _id: -1 })
            .skip(skip)
            .limit(limit);

        const articleTitles = articles.map((article: any) => ({
            articleId: article.articleId,
            title: article.title
        }));

        res.status(200).json({
            articles: articleTitles,
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit)
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send({ error: error.message });
    }
});

export default router;
