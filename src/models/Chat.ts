import mongoose, { Schema, Document } from 'mongoose';

export interface IChat extends Document {
  name?: string;
  type: 'DM' | 'GROUP';
  participants: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ChatSchema: Schema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    type: {
      type: String,
      enum: ['DM', 'GROUP'],
      required: true,
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index для быстрого поиска чатов пользователя
ChatSchema.index({ participants: 1 });
ChatSchema.index({ type: 1 });

export default mongoose.model<IChat>('Chat', ChatSchema);


