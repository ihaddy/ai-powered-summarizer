const jwt = require('jsonwebtoken');

const verifyJWT = (req, res, next) => {
    // Extract the token from the Authorization header
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).send("Access Denied: No Token Provided!");
    }

    const token = authHeader.split(' ')[1]; // Split the header to get the token part
    if (!token) {
        return res.status(401).send("Access Denied: No Token Provided!");
    }

    try {
        // Remove the first console.log as it would always be undefined at that point
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        console.log('token received correctly: ', req.user);
        next();
    } catch (error) {
        res.status(400).send("Invalid Token");
    }
};

module.exports = verifyJWT;
