const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const translationService = require('../services/translationService');
const { logger } = require('../utils/logger');
const Translation = require('../models/Translation');

/**
 * Controller for handling translation endpoints
 */
const translationController = {
  /**
   * Start a new translation job
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async startTranslation(req, res) {
    try {
      const { sourceLanguage, targetLanguage, service } = req.body;
      
      // Validate request
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      if (!sourceLanguage || !targetLanguage || !service) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }
      
      // Get file info
      const file = req.file;
      const fileExtension = path.extname(file.originalname).toLowerCase();
      const fileFormat = fileExtension.substring(1); // Remove the dot
      
      // Validate file format
      const supportedFormats = ['pdf', 'epub', 'txt', 'docx'];
      if (!supportedFormats.includes(fileFormat)) {
        return res.status(400).json({ 
          error: 'Unsupported file format',
          message: `Supported formats: ${supportedFormats.join(', ')}`
        });
      }
      
      // Create job details
      const job = {
        userId: req.user.id,
        sourceLanguage,
        targetLanguage,
        filePath: file.path,
        fileName: file.originalname,
        fileFormat,
        service
      };
      
      // Process translation asynchronously
      // For real production app, this would use a job queue
      translationService.processTranslation(job)
        .catch(err => {
          logger.error('Background translation error:', err);
        });
      
      // Return immediate response with job ID
      return res.status(202).json({
        message: 'Translation job started',
        job: {
          id: uuidv4(), // This would be the actual job ID in production
          fileName: file.originalname,
          sourceLanguage,
          targetLanguage,
          service,
          status: 'processing'
        }
      });
    } catch (error) {
      logger.error('Start translation error:', error);
      return res.status(500).json({ error: 'Failed to start translation', message: error.message });
    }
  },

  /**
   * Get translation job status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getTranslationStatus(req, res) {
    try {
      const { id } = req.params;
      
      // Get translation status
      const status = await translationService.getTranslationStatus(id);
      
      return res.status(200).json(status);
    } catch (error) {
      logger.error(`Get translation status error for ID ${req.params.id}:`, error);
      return res.status(404).json({ error: 'Translation not found', message: error.message });
    }
  },

  /**
   * Download translated file
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async downloadTranslation(req, res) {
    try {
      const { id } = req.params;
      
      // Get translation
      const translation = await Translation.findById(id);
      if (!translation) {
        return res.status(404).json({ error: 'Translation not found' });
      }
      
      // Check if translation is completed
      if (translation.status !== 'completed') {
        return res.status(400).json({ 
          error: 'Translation not ready',
          status: translation.status,
          progress: translation.progress
        });
      }
      
      // Check if file exists
      const filePath = translation.translatedFilePath;
      try {
        await fs.access(filePath);
      } catch (error) {
        return res.status(404).json({ error: 'Translated file not found' });
      }
      
      // Set content type based on file format
      const contentTypes = {
        pdf: 'application/pdf',
        epub: 'application/epub+zip',
        txt: 'text/plain',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      };
      
      const fileFormat = path.extname(filePath).substring(1).toLowerCase();
      const contentType = contentTypes[fileFormat] || 'application/octet-stream';
      
      // Set headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${translation.translatedFileName}"`);
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      logger.error(`Download translation error for ID ${req.params.id}:`, error);
      return res.status(500).json({ error: 'Failed to download translation', message: error.message });
    }
  },

  /**
   * Get all translations for a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getUserTranslations(req, res) {
    try {
      const userId = req.user.id;
      
      // Get translations for the user
      const translations = await Translation.find({ userId })
        .sort({ createdAt: -1 })
        .select('-__v');
      
      // Format response
      const formattedTranslations = translations.map(t => ({
        id: t._id,
        fileName: t.originalFileName,
        sourceLanguage: t.sourceLanguage,
        targetLanguage: t.targetLanguage,
        service: t.service,
        status: t.status,
        progress: t.progress,
        createdAt: t.createdAt,
        completedAt: t.completedAt
      }));
      
      return res.status(200).json(formattedTranslations);
    } catch (error) {
      logger.error('Get user translations error:', error);
      return res.status(500).json({ error: 'Failed to get translations', message: error.message });
    }
  },

  /**
   * Cancel a translation job
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async cancelTranslation(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      // Find translation
      const translation = await Translation.findById(id);
      if (!translation) {
        return res.status(404).json({ error: 'Translation not found' });
      }
      
      // Check if user owns this translation
      if (translation.userId.toString() !== userId) {
        return res.status(403).json({ error: 'Not authorized to cancel this translation' });
      }
      
      // Check if translation can be canceled
      if (translation.status === 'completed' || translation.status === 'canceled') {
        return res.status(400).json({ 
          error: `Translation already ${translation.status}`,
          status: translation.status
        });
      }
      
      // Update translation status
      translation.status = 'canceled';
      await translation.save();
      
      return res.status(200).json({
        message: 'Translation canceled successfully',
        id: translation._id,
        status: translation.status
      });
    } catch (error) {
      logger.error(`Cancel translation error for ID ${req.params.id}:`, error);
      return res.status(500).json({ error: 'Failed to cancel translation', message: error.message });
    }
  },

  /**
   * Delete a translation
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async deleteTranslation(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      // Find translation
      const translation = await Translation.findById(id);
      if (!translation) {
        return res.status(404).json({ error: 'Translation not found' });
      }
      
      // Check if user owns this translation
      if (translation.userId.toString() !== userId) {
        return res.status(403).json({ error: 'Not authorized to delete this translation' });
      }
      
      // Delete the translated file if it exists
      if (translation.translatedFilePath) {
        try {
          await fs.unlink(translation.translatedFilePath);
        } catch (error) {
          logger.warn(`Failed to delete file ${translation.translatedFilePath}:`, error);
          // Continue with deletion even if file removal fails
        }
      }
      
      // Delete translation from database
      await Translation.findByIdAndDelete(id);
      
      return res.status(200).json({
        message: 'Translation deleted successfully',
        id
      });
    } catch (error) {
      logger.error(`Delete translation error for ID ${req.params.id}:`, error);
      return res.status(500).json({ error: 'Failed to delete translation', message: error.message });
    }
  }
};

module.exports = translationController;