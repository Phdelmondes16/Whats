const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
  contact: {
    name: {
      type: String,
      required: true
    },
    number: {
      type: String,
      required: true
    },
    profilePic: {
      type: String,
      default: ''
    }
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['open', 'closed', 'paused', 'snoozed', 'unassigned'],
    default: 'unassigned'
  },
  lastMessage: {
    type: String,
    default: ''
  },
  lastMessageTime: {
    type: Date,
    default: Date.now
  },
  unreadCount: {
    type: Number,
    default: 0
  },
  isImportant: {
    type: Boolean,
    default: false
  },
  category: {
    type: String,
    enum: ['inbox', 'mine', 'unassigned', 'team'],
    default: 'unassigned'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Chat', ChatSchema);