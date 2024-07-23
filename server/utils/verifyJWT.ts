import Sentry from './instrument';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const verifyJWT = (req: Request, res: Response, next: NextFunction) => {
    // Extract the token from the Authorization header
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        const error = new Error("Access Denied: No Token Provided!");
        Sentry.captureException(error); // Capture the error with Sentry
        return res.status(401).send(error.message);
    }

    const token = authHeader.split(' ')[1]; // Split the header to get the token part
    if (!token) {
        const error = new Error("Access Denied: No Token Provided!");
        Sentry.captureException(error); // Capture the error with Sentry
        return res.status(401).send(error.message);
    }

    try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
        (req as any).user = decoded;
        next();
    } catch (error) {
        Sentry.captureException(error); // Capture the error with Sentry
        res.status(400).send("Invalid Token");
    }
};

export default verifyJWT;
