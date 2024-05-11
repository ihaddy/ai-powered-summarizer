const jwt = require('jsonwebtoken');

const verifySocketToken = (socket, next) => {
    // Extract the token from the query parameters sent during socket connection
    const token = socket.handshake.query.token;
    if (!token) {
        return next(new Error('Authentication error: No token provided'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);  // Ensure your environment variable is correctly set
        socket.user = decoded;  // Attach the user data to the socket session
        console.log('WebSocket token verified correctly: ', socket.user);
        next();
    } catch (error) {
        next(new Error('Authentication error: Invalid token'));
    }
};

module.exports = verifySocketToken;
