import BehaviorProfile from '../models/BehaviorProfile.js';
import mongoose from 'mongoose';

export const updateBehaviorProfile = async (userId, changes = {}) => {
  console.log('✅ updateBehaviorProfile CALLED with:', userId, changes);
  console.log(
    '✅ userId type:',
    typeof userId,
    'isObjectId:',
    userId instanceof mongoose.Types.ObjectId
  );

  try {
    // Convert userId to ObjectId (handles both string and ObjectId)
    let objectId = userId;
    if (typeof userId === 'string') {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        console.error('❌ Invalid userId format:', userId);
        return null;
      }
      objectId = new mongoose.Types.ObjectId(userId);
    } else if (userId instanceof mongoose.Types.ObjectId) {
      // Already an ObjectId, just use it
      objectId = userId;
    } else if (
      userId &&
      userId.toString &&
      mongoose.Types.ObjectId.isValid(userId.toString())
    ) {
      // Might be an ObjectId-like object, convert to string first then to ObjectId
      objectId = new mongoose.Types.ObjectId(userId.toString());
    } else {
      console.error('❌ Invalid userId type:', typeof userId, userId);
      return null;
    }

    console.log('✅ Using objectId:', objectId.toString());
    let profile = await BehaviorProfile.findOne({ userId: objectId });
    console.log('✅ Profile found:', profile ? 'YES' : 'NO (will create new)');

    if (!profile) {
      profile = new BehaviorProfile({ userId: objectId });
    }

    // Apply all changes
    for (const key in changes) {
      if (profile[key] !== undefined) {
        profile[key] = Math.max(0, Math.min(100, profile[key] + changes[key]));
      }
    }

    profile.lastUpdated = new Date();

    console.log(
      '🧠 Saving BehaviorProfile for:',
      objectId.toString(),
      'with values:',
      profile
    );

    await profile.save();

    console.log('✅ BehaviorProfile saved successfully:', profile._id);

    return profile;
  } catch (err) {
    console.error('❌ BehaviorProfile update error:', err.message);
    console.error('❌ Error stack:', err.stack);
    console.error('❌ Error details:', err);
    return null;
  }
};
