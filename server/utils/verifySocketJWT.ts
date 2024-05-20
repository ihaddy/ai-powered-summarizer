import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import jwt, { JwtPayload } from 'jsonwebtoken';

interface CustomSocket extends Socket {
    user?: string | JwtPayload;
}

const verifySocketToken = (socket: CustomSocket, next: (err?: ExtendedError) => void): void => {
    // Extract the token from the query parameters sent during socket connection
    const token = socket.handshake.query.token as string;
    if (!token) {
        return next(new Error('Authentication error: No token provided'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);  // Ensure your environment variable is correctly set
        socket.user = decoded;  // Attach the user data to the socket session
        console.log('WebSocket token verified correctly: ', socket.user);
        next();
    } catch (error) {
        next(new Error('Authentication error: Invalid token'));
    }
};

export default verifySocketToken;
