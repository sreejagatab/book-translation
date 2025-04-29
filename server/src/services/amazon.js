const AWS = require('aws-sdk');
const { logger } = require('../utils/logger');

/**
 * Amazon Translate service
 */
const amazonService = {
  /**
   * Translate text using Amazon Translate
   * @param {string} text - Text to translate
   * @param {string} sourceLanguage - Source language code
   * @param {string} targetLanguage - Target language code
   * @returns {Promise<string>} - Translated text
   */
  async translate(text, sourceLanguage, targetLanguage) {
    try {
      // Map language codes to Amazon format if needed
      const amazonSourceLang = this.mapLanguageCode(sourceLanguage);
      const amazonTargetLang = this.mapLanguageCode(targetLanguage);
      
      // Configure AWS SDK
      AWS.config.update({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1'
      });
      
      // Create Amazon Translate client
      const translate = new AWS.Translate();
      
      // Prepare parameters
      const params = {
        Text: text,
        SourceLanguageCode: amazonSourceLang,
        TargetLanguageCode: amazonTargetLang
      };
      
      // Call Amazon Translate
      const response = await translate.translateText(params).promise();
      
      // Return translated text
      return response.TranslatedText;
    } catch (error) {
      logger.error('Amazon Translate error:', error);
      
      // Handle specific AWS errors
      if (error.code === 'LimitExceededException') {
        throw new Error('Amazon Translate quota exceeded. Please try again later.');
      } else if (error.code === 'InvalidRequestException') {
        throw new Error(`Amazon Translate request invalid: ${error.message}`);
      } else if (error.code === 'UnrecognizedClientException') {
        throw new Error('Amazon Translate authentication failed. Please check your credentials.');
      } else if (error.code === 'TextSizeLimitExceededException') {
        throw new Error('Text size exceeds Amazon Translate limits. Please reduce the text size.');
      }
      
      // General error
      throw new Error(`Amazon Translate failed: ${error.message}`);
    }
  },
  
  /**
   * Map standard language codes to Amazon-specific codes
   * @param {string} languageCode - Standard language code
   * @returns {string} - Amazon language code
   */
  mapLanguageCode(languageCode) {
    // Amazon language codes are typically lowercase ISO codes
    // Most codes don't need mapping, but handle special cases
    const languageMap = {
      'zh': 'zh', // Chinese (Simplified)
      'zh-CN': 'zh', // Chinese (Simplified)
      'zh-TW': 'zh-TW', // Chinese (Traditional)
      'ja': 'ja', // Japanese
      'ko': 'ko', // Korean
      'ar': 'ar', // Arabic
      'cs': 'cs', // Czech
      'da': 'da', // Danish
      'nl': 'nl', // Dutch
      'en': 'en', // English
      'fi': 'fi', // Finnish
      'fr': 'fr', // French
      'de': 'de', // German
      'he': 'he', // Hebrew
      'hi': 'hi', // Hindi
      'id': 'id', // Indonesian
      'it': 'it', // Italian
      'ms': 'ms', // Malay
      'no': 'no', // Norwegian
      'fa': 'fa', // Persian
      'pl': 'pl', // Polish
      'pt': 'pt', // Portuguese
      'ro': 'ro', // Romanian
      'ru': 'ru', // Russian
      'es': 'es', // Spanish
      'sv': 'sv', // Swedish
      'tr': 'tr', // Turkish
      'uk': 'uk', // Ukrainian
      'vi': 'vi'  // Vietnamese
    };
    
    return languageMap[languageCode.toLowerCase()] || languageCode.toLowerCase();
  },
  
  /**
   * Check if a language is supported by Amazon Translate
   * @param {string} languageCode - Language code to check
   * @returns {boolean} - True if supported
   */
  isLanguageSupported(languageCode) {
    // Check if language is in the supported list
    const supportedLanguages = [
      'ar', 'zh', 'zh-TW', 'cs', 'da', 'nl', 'en',
      'fi', 'fr', 'de', 'he', 'hi', 'id', 'it',
      'ja', 'ko', 'ms', 'no', 'fa', 'pl', 'pt',
      'ro', 'ru', 'es', 'sv', 'tr', 'uk', 'vi'
    ];
    
    return supportedLanguages.includes(this.mapLanguageCode(languageCode));
  },
  
  /**
   * Get a list of all supported language pairs
   * @returns {Promise<Array>} - List of supported language pairs
   */
  async getSupportedLanguages() {
    try {
      // Configure AWS SDK
      AWS.config.update({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1'
      });
      
      // Create Amazon Translate client
      const translate = new AWS.Translate();
      
      // Get list of languages
      const response = await translate.listLanguages().promise();
      
      // Format and return languages
      return response.Languages.map(lang => ({
        code: lang.LanguageCode,
        name: lang.LanguageName
      }));
    } catch (error) {
      logger.error('Error getting supported languages from Amazon:', error);
      throw new Error(`Failed to get supported languages: ${error.message}`);
    }
  }
};

module.exports = amazonService;