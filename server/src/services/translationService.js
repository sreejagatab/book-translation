const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const Translation = require('../models/Translation');
const deeplService = require('./deepl');
const microsoftService = require('./microsoft');
const amazonService = require('./amazon');
const argosService = require('./argos');
const libreService = require('./libre');
const { 
  extractText, 
  convertToTargetFormat, 
  splitIntoChunks 
} = require('../utils/fileProcessing');

/**
 * Main translation service that handles the translation workflow 
 */
const translationService = {
  /**
   * Processes a translation job
   * @param {Object} job - Translation job details
   * @param {string} job.userId - User ID
   * @param {string} job.sourceLanguage - Source language code
   * @param {string} job.targetLanguage - Target language code
   * @param {string} job.filePath - Path to the uploaded file
   * @param {string} job.fileName - Original file name
   * @param {string} job.fileFormat - File format (pdf, epub, txt, docx)
   * @param {string} job.service - Translation service to use
   * @returns {Promise<Object>} - Translation result with download URL
   */
  async processTranslation(job) {
    try {
      // Create a translation record
      const translation = await Translation.create({
        userId: job.userId,
        sourceLanguage: job.sourceLanguage,
        targetLanguage: job.targetLanguage,
        originalFileName: job.fileName,
        fileFormat: job.fileFormat,
        service: job.service,
        status: 'processing'
      });

      // Generate unique directory for this job
      const jobId = translation._id.toString();
      const workDir = path.join(__dirname, '../../translations/temp', jobId);
      await fs.mkdir(workDir, { recursive: true });

      // Extract text from the file
      logger.info(`Extracting text from ${job.fileName}`);
      const extractedText = await extractText(job.filePath, job.fileFormat);

      // Split text into chunks for translation
      const chunks = splitIntoChunks(extractedText, 1000); // 1000 characters per chunk
      const totalChunks = chunks.length;

      // Update progress in the database
      await Translation.findByIdAndUpdate(jobId, {
        totalChunks,
        processedChunks: 0
      });

      // Translate chunks
      const translatedChunks = [];
      for (let i = 0; i < chunks.length; i++) {
        // Choose translation service
        const translatedText = await this.translateWithService(
          chunks[i],
          job.sourceLanguage,
          job.targetLanguage,
          job.service
        );

        translatedChunks.push(translatedText);

        // Update progress
        await Translation.findByIdAndUpdate(jobId, {
          processedChunks: i + 1,
          progress: Math.round(((i + 1) / totalChunks) * 100)
        });
      }

      // Combine translated chunks
      const translatedText = translatedChunks.join('');

      // Convert back to original format
      const outputFileName = `${path.parse(job.fileName).name}_${job.targetLanguage}${path.extname(job.fileName)}`;
      const outputPath = path.join(__dirname, '../../translations/completed', outputFileName);
      
      await convertToTargetFormat(translatedText, outputPath, job.fileFormat, {
        title: path.parse(job.fileName).name,
        language: job.targetLanguage
      });

      // Update translation record
      const updatedTranslation = await Translation.findByIdAndUpdate(
        jobId,
        {
          status: 'completed',
          progress: 100,
          translatedFilePath: outputPath,
          translatedFileName: outputFileName,
          completedAt: new Date()
        },
        { new: true }
      );

      // Clean up temp directory
      await fs.rmdir(workDir, { recursive: true });

      // Return result
      return {
        translationId: jobId,
        status: 'completed',
        downloadUrl: `/api/translations/${jobId}/download`,
        fileName: outputFileName
      };
    } catch (error) {
      logger.error('Translation processing error:', error);
      throw error;
    }
  },

  /**
   * Translate text using the selected service
   * @param {string} text - Text to translate
   * @param {string} sourceLanguage - Source language code
   * @param {string} targetLanguage - Target language code
   * @param {string} service - Translation service to use
   * @returns {Promise<string>} - Translated text
   */
  async translateWithService(text, sourceLanguage, targetLanguage, service) {
    try {
      switch (service) {
        case 'deepl':
          return await deeplService.translate(text, sourceLanguage, targetLanguage);
        case 'microsoft':
          return await microsoftService.translate(text, sourceLanguage, targetLanguage);
        case 'amazon':
          return await amazonService.translate(text, sourceLanguage, targetLanguage);
        case 'argos':
          return await argosService.translate(text, sourceLanguage, targetLanguage);
        case 'libre':
          return await libreService.translate(text, sourceLanguage, targetLanguage);
        default:
          throw new Error(`Unsupported translation service: ${service}`);
      }
    } catch (error) {
      logger.error(`Error translating with ${service}:`, error);
      throw error;
    }
  },

  /**
   * Get translation job status
   * @param {string} translationId - Translation ID
   * @returns {Promise<Object>} - Translation status
   */
  async getTranslationStatus(translationId) {
    const translation = await Translation.findById(translationId);
    if (!translation) {
      throw new Error('Translation not found');
    }

    return {
      id: translation._id,
      status: translation.status,
      progress: translation.progress,
      fileName: translation.originalFileName,
      sourceLanguage: translation.sourceLanguage,
      targetLanguage: translation.targetLanguage,
      service: translation.service,
      createdAt: translation.createdAt,
      completedAt: translation.completedAt
    };
  }
};

module.exports = translationService;