import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  chat: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  content: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema: Schema = new Schema(
  {
    chat: {
      type: Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index для быстрого получения сообщений чата
MessageSchema.index({ chat: 1, createdAt: -1 });

export default mongoose.model<IMessage>('Message', MessageSchema);


