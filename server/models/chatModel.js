const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    articleId: String,
    chats: Array
}, { strict: false });

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;
