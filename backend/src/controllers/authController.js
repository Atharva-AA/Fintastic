import User from '../models/User.js';
import { generateToken } from '../utils/generateToken.js';

/* ---------- SIGN UP / REGISTER ---------- */

export const registerUser = async (req, res) => {
  try {
    const { name, email, mobile, password, confirmPassword } = req.body;

    if (!name || !email || !mobile || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password too short' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      mobile,
      password,
    });

    const token = generateToken(res, user._id); // ✅ COOKIE SET HERE

    res.status(201).json({
      message: 'User registered successfully',
      token, // optional (cookie is main)
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/* ---------- LOGIN ---------- */

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(res, user._id); // ✅ COOKIE SET HERE

    return res.json({
      message: 'Login successful',
      token, // optional
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        age: user.age,
        cityType: user.cityType,
        dependents: user.dependents,
        riskLevel: user.riskLevel,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const logoutUser = (req, res) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0),
  });

  res.json({ message: 'Logged out successfully' });
};
