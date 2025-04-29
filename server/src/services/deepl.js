const axios = require('axios');
const { logger } = require('../utils/logger');

/**
 * DeepL translation service
 */
const deeplService = {
  /**
   * Translate text using the DeepL API
   * @param {string} text - Text to translate
   * @param {string} sourceLanguage - Source language code
   * @param {string} targetLanguage - Target language code
   * @returns {Promise<string>} - Translated text
   */
  async translate(text, sourceLanguage, targetLanguage) {
    try {
      // Map language codes to DeepL format if needed
      const deeplSourceLang = this.mapLanguageCode(sourceLanguage);
      const deeplTargetLang = this.mapLanguageCode(targetLanguage);
      
      // Get API key from environment variables
      const apiKey = process.env.DEEPL_API_KEY;
      if (!apiKey) {
        throw new Error('DeepL API key not configured');
      }

      // Make request to DeepL API
      const response = await axios.post(
        'https://api-free.deepl.com/v2/translate',
        {
          text: [text],
          source_lang: deeplSourceLang,
          target_lang: deeplTargetLang
        },
        {
          headers: {
            'Authorization': `DeepL-Auth-Key ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Check for successful response
      if (response.status !== 200 || !response.data || !response.data.translations || !response.data.translations.length) {
        throw new Error(`DeepL API error: ${response.status} ${JSON.stringify(response.data)}`);
      }

      // Return translated text
      return response.data.translations[0].text;
    } catch (error) {
      logger.error('DeepL translation error:', error);
      
      // Handle specific API errors
      if (error.response && error.response.status === 429) {
        throw new Error('DeepL API rate limit exceeded. Please try again later.');
      } else if (error.response && error.response.status === 403) {
        throw new Error('DeepL API authentication failed. Please check your API key.');
      } else if (error.response && error.response.status === 456) {
        throw new Error('DeepL API quota exceeded. Please upgrade your plan.');
      }
      
      throw new Error(`DeepL translation failed: ${error.message}`);
    }
  },

  /**
   * Map standard language codes to DeepL-specific codes
   * @param {string} languageCode - Standard language code
   * @returns {string} - DeepL language code
   */
  mapLanguageCode(languageCode) {
    const languageMap = {
      'en': 'EN', // English
      'es': 'ES', // Spanish
      'fr': 'FR', // French
      'de': 'DE', // German
      'it': 'IT', // Italian
      'pt': 'PT', // Portuguese
      'ru': 'RU', // Russian
      'zh': 'ZH', // Chinese
      'ja': 'JA', // Japanese
      'ko': 'KO', // Korean
      // Add more mappings as needed
    };
    
    return languageMap[languageCode] || languageCode.toUpperCase();
  }
};

module.exports = deeplService;