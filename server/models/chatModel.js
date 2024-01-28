const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId, // Reference to the user
    articleId: String,
    chats: Array
}, { strict: false });

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;
