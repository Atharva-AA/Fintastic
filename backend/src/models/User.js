import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    occupation: {
      type: [String], // array of strings
      default: [],
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },

    mobile: {
      type: String,
      required: true,
    },

    // ✅ ADD THIS
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false, // hide by default in queries
    },

    age: {
      type: Number,
      min: 16,
      max: 100,
    },

    cityType: {
      type: String,
      enum: ['urban', 'semi_urban', 'rural'],
      default: 'semi_urban',
    },

    dependents: {
      type: Number,
      default: 0,
    },

    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
  },
  { timestamps: true }
);

/* ---------------- PASSWORD HASH ---------------- */

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

/* ---------------- PASSWORD MATCH ---------------- */

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);
