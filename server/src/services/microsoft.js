const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');

/**
 * Microsoft Translator service
 */
const microsoftService = {
  /**
   * Translate text using Microsoft Translator
   * @param {string} text - Text to translate
   * @param {string} sourceLanguage - Source language code
   * @param {string} targetLanguage - Target language code
   * @returns {Promise<string>} - Translated text
   */
  async translate(text, sourceLanguage, targetLanguage) {
    try {
      // Map language codes to Microsoft format if needed
      const msSourceLang = this.mapLanguageCode(sourceLanguage);
      const msTargetLang = this.mapLanguageCode(targetLanguage);
      
      // Get API key from environment variables
      const apiKey = process.env.MS_TRANSLATOR_KEY;
      if (!apiKey) {
        throw new Error('Microsoft Translator API key not configured');
      }
      
      // Get Azure region
      const region = process.env.MS_TRANSLATOR_REGION || 'global';
      
      // Microsoft Translator API endpoint
      const endpoint = 'https://api.cognitive.microsofttranslator.com/translate';
      
      // Request payload
      const data = [{
        text: text
      }];
      
      // Make request to Microsoft Translator API
      const response = await axios({
        method: 'post',
        url: endpoint,
        params: {
          'api-version': '3.0',
          'from': msSourceLang,
          'to': msTargetLang
        },
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
          'Ocp-Apim-Subscription-Region': region,
          'Content-type': 'application/json',
          'X-ClientTraceId': uuidv4()
        },
        data
      });
      
      // Check for successful response
      if (!response.data || !response.data.length || !response.data[0].translations || !response.data[0].translations.length) {
        throw new Error('Invalid response from Microsoft Translator API');
      }
      
      // Return translated text
      return response.data[0].translations[0].text;
    } catch (error) {
      logger.error('Microsoft Translator error:', error);
      
      // Handle HTTP errors
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        
        if (status === 401) {
          throw new Error('Microsoft Translator authentication failed. Please check your API key.');
        } else if (status === 403) {
          throw new Error('Microsoft Translator access denied. Please check your subscription.');
        } else if (status === 429) {
          throw new Error('Microsoft Translator rate limit exceeded. Please try again later.');
        } else if (status === 400) {
          const errorMessage = errorData.error ? errorData.error.message : 'Bad request';
          throw new Error(`Microsoft Translator request invalid: ${errorMessage}`);
        } else {
          throw new Error(`Microsoft Translator API error: ${status} ${JSON.stringify(errorData)}`);
        }
      }
      
      // General error
      throw new Error(`Microsoft Translator failed: ${error.message}`);
    }
  },
  
  /**
   * Map standard language codes to Microsoft-specific codes
   * @param {string} languageCode - Standard language code
   * @returns {string} - Microsoft language code
   */
  mapLanguageCode(languageCode) {
    // Microsoft Translator uses standard BCP-47 language tags
    // Most codes don't need mapping, but handle special cases
    const languageMap = {
      'zh': 'zh-Hans', // Chinese (Simplified)
      'zh-CN': 'zh-Hans', // Chinese (Simplified)
      'zh-TW': 'zh-Hant', // Chinese (Traditional)
      'sr-Latn': 'sr-Latn', // Serbian (Latin)
      'sr-Cyrl': 'sr-Cyrl', // Serbian (Cyrillic)
      'no': 'nb', // Norwegian
      'pt': 'pt', // Portuguese (unspecified)
      'pt-BR': 'pt-br', // Portuguese (Brazil)
      'pt-PT': 'pt-pt', // Portuguese (Portugal)
      'sr': 'sr-Cyrl' // Serbian (default to Cyrillic)
    };
    
    return languageMap[languageCode] || languageCode;
  },
  
  /**
   * Check if a language is supported by Microsoft Translator
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
      throw error;
    }
  },
  
  /**
   * Get a list of all supported languages
   * @returns {Promise<Array>} - List of supported languages
   */
  async getSupportedLanguages() {
    try {
      // Get API key from environment variables
      const apiKey = process.env.MS_TRANSLATOR_KEY;
      if (!apiKey) {
        throw new Error('Microsoft Translator API key not configured');
      }
      
      // Get Azure region
      const region = process.env.MS_TRANSLATOR_REGION || 'global';
      
      // Microsoft Translator languages endpoint
      const endpoint = 'https://api.cognitive.microsofttranslator.com/languages';
      
      // Make request to Microsoft Translator API
      const response = await axios({
        method: 'get',
        url: endpoint,
        params: {
          'api-version': '3.0',
          'scope': 'translation'
        },
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
          'Ocp-Apim-Subscription-Region': region,
          'Accept-Language': 'en'
        }
      });
      
      // Check for successful response
      if (!response.data || !response.data.translation) {
        throw new Error('Invalid response from Microsoft Translator API');
      }
      
      // Format and return languages
      const languages = [];
      for (const [code, data] of Object.entries(response.data.translation)) {
        languages.push({
          code: code,
          name: data.name,
          nativeName: data.nativeName,
          dir: data.dir
        });
      }
      
      return languages;
    } catch (error) {
      logger.error('Error getting supported languages from Microsoft:', error);
      throw new Error(`Failed to get supported languages: ${error.message}`);
    }
  }
};

module.exports = microsoftService;