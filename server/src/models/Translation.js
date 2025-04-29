const mongoose = require('mongoose');

/**
 * Translation schema for MongoDB
 */
const translationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originalFileName: {
    type: String,
    required: true
  },
  fileFormat: {
    type: String,
    required: true,
    enum: ['pdf', 'epub', 'txt', 'docx']
  },
  sourceLanguage: {
    type: String,
    required: true
  },
  targetLanguage: {
    type: String,
    required: true
  },
  service: {
    type: String,
    required: true,
    enum: ['deepl', 'microsoft', 'amazon', 'argos', 'libre']
  },
  status: {
    type: String,
    required: true,
    enum: ['processing', 'completed', 'failed', 'canceled'],
    default: 'processing'
  },
  progress: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 0
  },
  totalChunks: {
    type: Number,
    default: 0
  },
  processedChunks: {
    type: Number,
    default: 0
  },
  translatedFilePath: {
    type: String
  },
  translatedFileName: {
    type: String
  },
  errorMessage: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
translationSchema.index({ userId: 1, createdAt: -1 });
translationSchema.index({ status: 1 });

// Virtual for download URL
translationSchema.virtual('downloadUrl').get(function() {
  if (this.status === 'completed' && this.translatedFilePath) {
    return `/api/translations/${this._id}/download`;
  }
  return null;
});

// Method to update progress
translationSchema.methods.updateProgress = async function(processedChunks) {
  if (this.totalChunks > 0) {
    this.processedChunks = processedChunks;
    this.progress = Math.round((processedChunks / this.totalChunks) * 100);
    return this.save();
  }
  return this;
};

// Method to mark as completed
translationSchema.methods.markCompleted = async function(translatedFilePath, translatedFileName) {
  this.status = 'completed';
  this.progress = 100;
  this.translatedFilePath = translatedFilePath;
  this.translatedFileName = translatedFileName;
  this.completedAt = new Date();
  return this.save();
};

// Method to mark as failed
translationSchema.methods.markFailed = async function(errorMessage) {
  this.status = 'failed';
  this.errorMessage = errorMessage;
  return this.save();
};

module.exports = mongoose.model('Translation', translationSchema);