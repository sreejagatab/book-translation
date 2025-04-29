const axios = require('axios');
const { logger } = require('../utils/logger');

/**
 * LibreTranslate service
 */
const libreService = {
  /**
   * Translate text using LibreTranslate
   * @param {string} text - Text to translate
   * @param {string} sourceLanguage - Source language code
   * @param {string} targetLanguage - Target language code
   * @returns {Promise<string>} - Translated text
   */
  async translate(text, sourceLanguage, targetLanguage) {
    try {
      // Map language codes to LibreTranslate format if needed
      const libreSourceLang = this.mapLanguageCode(sourceLanguage);
      const libreTargetLang = this.mapLanguageCode(targetLanguage);
      
      // Get LibreTranslate API URL from environment variables
      const apiUrl = process.env.LIBRE_TRANSLATE_API_URL || 'http://localhost:5000';
      
      // Get API key if configured
      const apiKey = process.env.LIBRE_TRANSLATE_API_KEY || '';
      
      // Prepare request data
      const data = {
        q: text,
        source: libreSourceLang,
        target: libreTargetLang,
        format: 'text',
        api_key: apiKey
      };
      
      // Make request to LibreTranslate API
      const response = await axios.post(`${apiUrl}/translate`, data);
      
      // Check for successful response
      if (!response.data || !response.data.translatedText) {
        throw new Error('Invalid response from LibreTranslate API');
      }
      
      // Return translated text
      return response.data.translatedText;
    } catch (error) {
      logger.error('LibreTranslate error:', error);
      
      // Handle HTTP errors
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        
        if (status === 403) {
          throw new Error('LibreTranslate API key is invalid or missing.');
        } else if (status === 400) {
          const errorMessage = errorData.error || 'Bad request';
          throw new Error(`LibreTranslate request invalid: ${errorMessage}`);
        } else if (status === 500) {
          throw new Error('LibreTranslate server error. Please try again later.');
        } else if (status === 429) {
          throw new Error('LibreTranslate rate limit exceeded. Please try again later.');
        } else {
          throw new Error(`LibreTranslate API error: ${status} ${JSON.stringify(errorData)}`);
        }
      }
      
      // Network errors
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new Error('Could not connect to LibreTranslate server. Please check the server URL and make sure it is running.');
      }
      
      // General error
      throw new Error(`LibreTranslate failed: ${error.message}`);
    }
  },
  
  /**
   * Map standard language codes to LibreTranslate-specific codes
   * @param {string} languageCode - Standard language code
   * @returns {string} - LibreTranslate language code
   */
  mapLanguageCode(languageCode) {
    // LibreTranslate uses ISO 639-1 language codes
    // Most don't need mapping but handle special cases
    const languageMap = {
      'zh': 'zh', // Chinese
      'zh-CN': 'zh', // Chinese (Simplified)
      'zh-TW': 'zh', // Chinese (Traditional) - not differentiated
      'en': 'en', // English
      'fr': 'fr', // French
      'de': 'de', // German
      'it': 'it', // Italian
      'ja': 'ja', // Japanese
      'ko': 'ko', // Korean
      'pt': 'pt', // Portuguese
      'ru': 'ru', // Russian
      'es': 'es', // Spanish
      'ar': 'ar', // Arabic
      'bg': 'bg', // Bulgarian
      'cs': 'cs', // Czech
      'da': 'da', // Danish
      'nl': 'nl', // Dutch
      'fi': 'fi', // Finnish
      'el': 'el', // Greek
      'he': 'he', // Hebrew
      'hi': 'hi', // Hindi
      'hu': 'hu', // Hungarian
      'id': 'id', // Indonesian
      'pl': 'pl', // Polish
      'ro': 'ro', // Romanian
      'sk': 'sk', // Slovak
      'sv': 'sv', // Swedish
      'tr': 'tr', // Turkish
      'uk': 'uk'  // Ukrainian
    };
    
    // Extract base language code if necessary (e.g., en-US -> en)
    const baseCode = languageCode.split('-')[0].toLowerCase();
    
    return languageMap[languageCode] || languageMap[baseCode] || baseCode;
  },
  
  /**
   * Check server availability
   * @returns {Promise<boolean>} - True if server is available
   */
  async isServerAvailable() {
    try {
      // Get LibreTranslate API URL
      const apiUrl = process.env.LIBRE_TRANSLATE_API_URL || 'http://localhost:5000';
      
      // Check if server is responding
      const response = await axios.get(apiUrl);
      return response.status === 200;
    } catch (error) {
      logger.error('Error checking LibreTranslate server availability:', error);
      return false;
    }
  },
  
  /**
   * Get supported languages from LibreTranslate server
   * @returns {Promise<Array>} - Array of supported languages
   */
  async getSupportedLanguages() {
    try {
      // Get LibreTranslate API URL
      const apiUrl = process.env.LIBRE_TRANSLATE_API_URL || 'http://localhost:5000';
      
      // Get API key if configured
      const apiKey = process.env.LIBRE_TRANSLATE_API_KEY || '';
      
      // Make request to LibreTranslate API
      const response = await axios.get(`${apiUrl}/languages`, {
        params: apiKey ? { api_key: apiKey } : {}
      });
      
      // Check for successful response
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid response from LibreTranslate API');
      }
      
      // Format and return languages
      return response.data.map(lang => ({
        code: lang.code,
        name: lang.name
      }));
    } catch (error) {
      logger.error('Error getting supported languages from LibreTranslate:', error);
      throw new Error(`Failed to get supported languages: ${error.message}`);
    }
  },
  
  /**
   * Check if a language is supported by LibreTranslate
   * @param {string} languageCode - Language code to check
   * @returns {Promise<boolean>} - True if supported
   */
  async isLanguageSupported(languageCode) {
    try {
      const languages = await this.getSupportedLanguages();
      const mappedCode = this.mapLanguageCode(languageCode);
      
      return languages.some(lang => lang.code === mappedCode);
    } catch (error) {
      logger.error(`Error checking if language ${languageCode} is supported:`, error);
      return false;
    }
  }
};

module.exports = libreService;