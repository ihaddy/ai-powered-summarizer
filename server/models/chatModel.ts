import mongoose, { Document, Schema } from 'mongoose';

export interface IChat extends Document {
  userId: mongoose.Types.ObjectId;
  articleId: string;
  chats: any[];
  title: string;
  description: string;
  transcript: string;
  videoId: string;
  thumbnail: string;
  transcriptionWithTimestamps: any[];
}

const chatSchema: Schema = new Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Reference to the user
  articleId: { type: String, required: true },
  chats: { type: [Schema.Types.Mixed], default: [] }, // Assuming chats is an array of any type
  title: { type: String, required: true },
  description: { type: String, required: true },
  transcript: { type: String, required: true },
  videoId: { type: String, required: true },
  transcriptionWithTimestamps: [Schema.Types.Mixed]
}, { strict: false });

const Chat = mongoose.model<IChat>('Chat', chatSchema);

export default Chat;
