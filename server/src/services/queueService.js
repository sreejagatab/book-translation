const Queue = require('bull');
const Redis = require('ioredis');
const { logger } = require('../utils/logger');
const translationService = require('./translationService');

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
};

// Create Redis client
let redisClient;
if (process.env.REDIS_URL) {
  redisClient = new Redis(process.env.REDIS_URL);
} else {
  redisClient = new Redis(redisConfig);
}

// Translation queue
const translationQueue = new Queue('translation', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: true,
    removeOnFail: false
  }
});

// Define queue events
translationQueue.on('completed', (job, result) => {
  logger.info(`Translation job ${job.id} completed successfully`);
});

translationQueue.on('failed', (job, error) => {
  logger.error(`Translation job ${job.id} failed: ${error.message}`);
});

translationQueue.on('error', (error) => {
  logger.error(`Translation queue error: ${error.message}`);
});

// Define queue processors
translationQueue.process(async (job) => {
  logger.info(`Processing translation job ${job.id}`);
  try {
    // Extract job data
    const { translationData } = job.data;
    
    // Process translation
    const result = await translationService.processTranslation(translationData);
    
    // Return result
    return result;
  } catch (error) {
    logger.error(`Error processing translation job ${job.id}:`, error);
    throw error;
  }
});

/**
 * Queue service methods
 */
const queueService = {
  /**
   * Add translation job to queue
   * @param {Object} translationData - Translation job data
   * @returns {Promise<Object>} - Job object
   */
  queueTranslation: async (translationData) => {
    try {
      // Add job to queue with priority based on user role/plan
      const priority = translationData.priority || 10; // Lower number = higher priority
      
      const job = await translationQueue.add(
        { translationData },
        { priority }
      );
      
      logger.info(`Translation job ${job.id} added to queue`);
      
      // Return job details
      return {
        jobId: job.id,
        status: 'queued'
      };
    } catch (error) {
      logger.error('Error adding translation job to queue:', error);
      throw error;
    }
  },
  
  /**
   * Get translation job status
   * @param {String} jobId - Job ID
   * @returns {Promise<Object>} - Job status
   */
  getJobStatus: async (jobId) => {
    try {
      const job = await translationQueue.getJob(jobId);
      
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }
      
      // Get job state
      const state = await job.getState();
      
      // Get job progress
      const progress = job._progress;
      
      return {
        jobId: job.id,
        status: state,
        progress: progress,
        data: job.data
      };
    } catch (error) {
      logger.error(`Error getting job status for ${jobId}:`, error);
      throw error;
    }
  },
  
  /**
   * Get all jobs in the queue
   * @returns {Promise<Array>} - Array of jobs
   */
  getAllJobs: async () => {
    try {
      const jobs = await translationQueue.getJobs();
      
      return jobs.map(job => ({
        jobId: job.id,
        data: job.data,
        timestamp: job.timestamp
      }));
    } catch (error) {
      logger.error('Error getting all jobs:', error);
      throw error;
    }
  },
  
  /**
   * Update job progress
   * @param {String} jobId - Job ID
   * @param {Number} progress - Progress percentage (0-100)
   * @returns {Promise<Object>} - Updated job
   */
  updateJobProgress: async (jobId, progress) => {
    try {
      const job = await translationQueue.getJob(jobId);
      
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }
      
      await job.progress(progress);
      
      return {
        jobId: job.id,
        progress: progress
      };
    } catch (error) {
      logger.error(`Error updating job progress for ${jobId}:`, error);
      throw error;
    }
  },
  
  /**
   * Clean completed and failed jobs
   * @returns {Promise<Object>} - Cleanup results
   */
  cleanupJobs: async () => {
    try {
      // Clean completed jobs older than 1 day
      const completedCount = await translationQueue.clean(86400000, 'completed');
      
      // Clean failed jobs older than 7 days
      const failedCount = await translationQueue.clean(604800000, 'failed');
      
      return {
        completedCleaned: completedCount,
        failedCleaned: failedCount
      };
    } catch (error) {
      logger.error('Error cleaning up jobs:', error);
      throw error;
    }
  },
  
  /**
   * Get queue health metrics
   * @returns {Promise<Object>} - Queue metrics
   */
  getQueueMetrics: async () => {
    try {
      // Get counts
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        translationQueue.getWaitingCount(),
        translationQueue.getActiveCount(),
        translationQueue.getCompletedCount(),
        translationQueue.getFailedCount(),
        translationQueue.getDelayedCount()
      ]);
      
      return {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed
      };
    } catch (error) {
      logger.error('Error getting queue metrics:', error);
      throw error;
    }
  }
};

module.exports = queueService;