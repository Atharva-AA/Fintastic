import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.DB_URI || 'mongodb://127.0.0.1:27017/fintastic';

try {
  await mongoose.connect(uri);
  await mongoose.connection.db.dropDatabase();
  console.log('🧹 MongoDB database cleared successfully');
} catch (err) {
  console.error('❌ Failed to clear database:', err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
  process.exit();
}

