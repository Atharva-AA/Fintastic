import User from '../models/User.js';

export const getAllUsersForMentor = async (req, res) => {
  try {
    const users = await User.find({}).select('_id name email').lean();

    if (!users || users.length === 0) {
      return res.status(404).json({ message: 'No users found' });
    }

    return res.json({
      success: true,
      count: users.length,
      users: users.map((u) => ({
        userId: u._id,
        name: u.name,
        email: u.email,
      })),
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};