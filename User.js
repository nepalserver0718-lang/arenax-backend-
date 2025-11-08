const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { 
    type: String, 
    trim: true, 
    required: true,
    unique: true 
  },
  email: { 
    type: String, 
    trim: true, 
    required: true, 
    unique: true 
  },
  phone: { 
    type: String, 
    trim: true, 
    default: '' 
  },
  password: { 
    type: String, 
    required: true 
  },
  avatarUrl: { 
    type: String, 
    default: '' 
  },
  stats: {
    totalWins: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    totalMatches: { type: Number, default: 0 }
  },
  walletBalance: { type: Number, default: 0 },
  isAdmin: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);