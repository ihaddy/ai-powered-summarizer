// const winston = require('winston');

// // Create a custom format for logging
// const customFormat = winston.format.printf(({ level, message, label, timestamp, ...metadata }) => {
//     let msg = `${timestamp} [${label}] ${level}: ${message} ` 
//     if (metadata) {
//         msg += JSON.stringify(metadata)
//     }
//     return msg;
// });

// // Create the logger
// const logger = winston.createLogger({
//     level: 'info',
//     format: winston.format.combine(
//         winston.format.label({ label: 'your-label' }),
//         winston.format.timestamp(),
//         winston.format.errors({ stack: true }),
//         winston.format.splat(),
//         winston.format.json(),
//         customFormat
//     ),
//     transports: [
//         new winston.transports.Console(),
//         new winston.transports.File({ filename: 'combined.log' })
//     ],
// });

// module.exports = logger;
// // Example of logging
// // logger.info("in subscribe.js - successHandler: Received success message:", { successMessage: "your-success-message" });
