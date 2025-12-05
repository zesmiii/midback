import mongoose from 'mongoose';

export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/chatdb?authSource=admin';
    
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};


