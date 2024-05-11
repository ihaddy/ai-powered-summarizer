import express, { Response, Router } from 'express';
import Chat from '../models/chatModel';
import verifyJWT from '../utils/verifyJWT'; 
import logger from '../utils/logger';
import { Request } from '../customTypes/request';

const router: Router = express.Router();

router.get('/chat/:articleId', verifyJWT, async (req: Request, res: Response) => {
    const userId: string = (req.user as any).userId;
    console.log(`GET /chat/${req.params.articleId} - Request received to retrieve chat log`);

    try {
        const articleId: string = req.params.articleId;

        console.log(`Fetching chat log from MongoDB for userId: ${userId}, articleId: ${articleId}`);
        const chatLog = await Chat.findOne({ userId: userId, articleId: articleId });

        if (chatLog) {
            console.log('Found chat log in MongoDB');
            res.status(200).json(chatLog);
        } else {
            console.log('Chat log not found for userId:', userId, 'articleId:', articleId);
            res.status(404).send({ message: 'Chat log not found.' });
        }
    } catch (error) {
        console.error('GET /chat/:articleId - Error:', error);
        res.status(500).send({ error: error.message });
    }
});


router.get('/chathistory', verifyJWT, async (req: Request, res: Response) => {
    const userId: string = (req.user as any).userId;
    const userEmail: string = (req.user as any).email;
    console.log('GET /chathistory - Request received to retrieve all chat logs for user');
    try {
        console.log(`Querying MongoDB for all chat logs for userId: ${userId}`);
        const chatLogs = await Chat.find({ userId: userId }, 'articleId');

        const articleIds: string[] = chatLogs.map((chat: any) => chat.articleId);
        console.log('Successfully retrieved chat logs for user');
        res.status(200).json(articleIds);
    } catch (error) {
        console.error('GET /chathistory - Error:', error);
        res.status(500).send({ error: error.message });
    }
});

export default router;
