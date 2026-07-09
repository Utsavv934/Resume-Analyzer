import mongoose from 'mongoose';

const ChatMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'model'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const ResumeSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true
  },
  targetJobDescription: {
    type: String,
    default: ''
  },
  extractedText: {
    type: String,
    required: true
  },
  analysis: {
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    summary: {
      type: String,
      required: true
    },
    strengths: {
      type: [String],
      default: []
    },
    improvements: {
      type: [String],
      default: []
    },
    skills: {
      type: [String],
      default: []
    },
    formattingFeedback: {
      type: String,
      default: ''
    },
    jobMatch: {
      score: {
        type: Number,
        default: null
      },
      gaps: {
        type: [String],
        default: []
      },
      recommendations: {
        type: [String],
        default: []
      }
    },
    actionPlan: {
      type: [String],
      default: []
    }
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  chatHistory: {
    type: [ChatMessageSchema],
    default: []
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  coverLetter: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Resume', ResumeSchema);
