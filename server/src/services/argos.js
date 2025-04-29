const { exec } = require('child_process');
const util = require('util');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { logger } = require('../utils/logger');

// Promisify exec
const execPromise = util.promisify(exec);

/**
 * Argos Translate service for offline translation
 */
const argosService = {
  /**
   * Translate text using Argos Translate (offline)
   * @param {string} text - Text to translate
   * @param {string} sourceLanguage - Source language code
   * @param {string} targetLanguage - Target language code
   * @returns {Promise<string>} - Translated text
   */
  async translate(text, sourceLanguage, targetLanguage) {
    try {
      // Map language codes to Argos format
      const argosSourceLang = this.mapLanguageCode(sourceLanguage);
      const argosTargetLang = this.mapLanguageCode(targetLanguage);
      
      // Check if language pair is available
      const isPairAvailable = await this.isLanguagePairAvailable(argosSourceLang, argosTargetLang);
      if (!isPairAvailable) {
        // Try to download the language pair
        await this.downloadLanguagePair(argosSourceLang, argosTargetLang);
      }
      
      // Create temporary input file
      const tempInputPath = path.join(os.tmpdir(), `argos_input_${Date.now()}.txt`);
      await fs.writeFile(tempInputPath, text, 'utf8');
      
      // Create temporary output file path
      const tempOutputPath = path.join(os.tmpdir(), `argos_output_${Date.now()}.txt`);
      
      // Run Argos Translate command
      const command = `argos-translate --from ${argosSourceLang} --to ${argosTargetLang} --input ${tempInputPath} --output ${tempOutputPath}`;
      await execPromise(command);
      
      // Read output file
      const translatedText = await fs.readFile(tempOutputPath, 'utf8');
      
      // Clean up temporary files
      await Promise.all([
        fs.unlink(tempInputPath),
        fs.unlink(tempOutputPath)
      ]);
      
      return translatedText;
    } catch (error) {
      logger.error('Argos Translate error:', error);
      
      if (error.message.includes('not installed') || error.message.includes('No such file or directory')) {
        throw new Error('Argos Translate not installed. Please install it first.');
      } else if (error.message.includes('package not available')) {
        throw new Error(`Language pair from ${sourceLanguage} to ${targetLanguage} is not available.`);
      }
      
      throw new Error(`Argos Translate failed: ${error.message}`);
    }
  },
  
  /**
   * Map standard language codes to Argos-specific codes
   * @param {string} languageCode - Standard language code
   * @returns {string} - Argos language code
   */
  mapLanguageCode(languageCode) {
    // Argos Translate uses ISO 639-1 language codes
    const languageMap = {
      'en': 'en', // English
      'es': 'es', // Spanish
      'fr': 'fr', // French
      'de': 'de', // German
      'it': 'it', // Italian
      'pt': 'pt', // Portuguese
      'ru': 'ru', // Russian
      'zh': 'zh', // Chinese
      'zh-CN': 'zh', // Chinese (Simplified)
      'ja': 'ja', // Japanese
      'ar': 'ar', // Arabic
      'hi': 'hi', // Hindi
      'bg': 'bg', // Bulgarian
      'ca': 'ca', // Catalan
      'cs': 'cs', // Czech
      'da': 'da', // Danish
      'nl': 'nl', // Dutch
      'fi': 'fi', // Finnish
      'el': 'el', // Greek
      'he': 'he', // Hebrew
      'hu': 'hu', // Hungarian
      'id': 'id', // Indonesian
      'ko': 'ko', // Korean
      'pl': 'pl', // Polish
      'ro': 'ro', // Romanian
      'sk': 'sk', // Slovak
      'sv': 'sv', // Swedish
      'tr': 'tr', // Turkish
      'uk': 'uk'  // Ukrainian
    };
    
    return languageMap[languageCode] || languageCode;
  },
  
  /**
   * Check if Argos Translate is installed
   * @returns {Promise<boolean>} - True if installed
   */
  async isInstalled() {
    try {
      await execPromise('which argos-translate');
      return true;
    } catch (error) {
      return false;
    }
  },
  
  /**
   * Check if a language pair is available
   * @param {string} sourceLanguage - Source language code
   * @param {string} targetLanguage - Target language code
   * @returns {Promise<boolean>} - True if available
   */
  async isLanguagePairAvailable(sourceLanguage, targetLanguage) {
    try {
      // Check if Argos is installed
      const isInstalled = await this.isInstalled();
      if (!isInstalled) {
        throw new Error('Argos Translate not installed');
      }
      
      // Get available packages
      const { stdout } = await execPromise('argos-translate --list-available-packages');
      
      // Check if the language pair is in the available packages
      const pairPattern = new RegExp(`${sourceLanguage} -> ${targetLanguage}`);
      return pairPattern.test(stdout);
    } catch (error) {
      logger.error('Error checking language pair availability:', error);
      return false;
    }
  },
  
  /**
   * Download a language pair
   * @param {string} sourceLanguage - Source language code
   * @param {string} targetLanguage - Target language code
   * @returns {Promise<void>}
   */
  async downloadLanguagePair(sourceLanguage, targetLanguage) {
    try {
      // Check if Argos is installed
      const isInstalled = await this.isInstalled();
      if (!isInstalled) {
        throw new Error('Argos Translate not installed');
      }
      
      logger.info(`Downloading Argos language pair: ${sourceLanguage} -> ${targetLanguage}`);
      
      // Get available packages from Argos index
      const { stdout: availablePackages } = await execPromise('argos-translate --list-available-packages');
      
      // Find the package ID for this language pair
      const pairRegex = new RegExp(`(\\S+)\\s+${sourceLanguage} -> ${targetLanguage}`, 'gm');
      const match = pairRegex.exec(availablePackages);
      
      if (!match || !match[1]) {
        throw new Error(`No package available for ${sourceLanguage} -> ${targetLanguage}`);
      }
      
      const packageId = match[1];
      
      // Download the package
      await execPromise(`argos-translate --install-package ${packageId}`);
      
      logger.info(`Successfully downloaded language pair: ${sourceLanguage} -> ${targetLanguage}`);
    } catch (error) {
      logger.error(`Error downloading language pair ${sourceLanguage} -> ${targetLanguage}:`, error);
      throw new Error(`Failed to download language pair: ${error.message}`);
    }
  },
  
  /**
   * Get all installed language pairs
   * @returns {Promise<Array>} - Array of installed language pairs
   */
  async getInstalledLanguagePairs() {
    try {
      // Check if Argos is installed
      const isInstalled = await this.isInstalled();
      if (!isInstalled) {
        throw new Error('Argos Translate not installed');
      }
      
      // Get installed packages
      const { stdout } = await execPromise('argos-translate --list-installed-packages');
      
      // Parse output to get language pairs
      const pairs = [];
      const pairRegex = /(\S+)\s+(\S+) -> (\S+)/g;
      let match;
      
      while ((match = pairRegex.exec(stdout)) !== null) {
        pairs.push({
          packageId: match[1],
          sourceLanguage: match[2],
          targetLanguage: match[3]
        });
      }
      
      return pairs;
    } catch (error) {
      logger.error('Error getting installed language pairs:', error);
      throw new Error(`Failed to get installed language pairs: ${error.message}`);
    }
  },
  
  /**
   * Get all available language pairs from Argos repository
   * @returns {Promise<Array>} - Array of available language pairs
   */
  async getAvailableLanguagePairs() {
    try {
      // Check if Argos is installed
      const isInstalled = await this.isInstalled();
      if (!isInstalled) {
        throw new Error('Argos Translate not installed');
      }
      
      // Get available packages
      const { stdout } = await execPromise('argos-translate --list-available-packages');
      
      // Parse output to get language pairs
      const pairs = [];
      const pairRegex = /(\S+)\s+(\S+) -> (\S+)/g;
      let match;
      
      while ((match = pairRegex.exec(stdout)) !== null) {
        pairs.push({
          packageId: match[1],
          sourceLanguage: match[2],
          targetLanguage: match[3]
        });
      }
      
      return pairs;
    } catch (error) {
      logger.error('Error getting available language pairs:', error);
      throw new Error(`Failed to get available language pairs: ${error.message}`);
    }
  },
  
  /**
   * Get Argos Translate version
   * @returns {Promise<string>} - Version string
   */
  async getVersion() {
    try {
      // Check if Argos is installed
      const isInstalled = await this.isInstalled();
      if (!isInstalled) {
        throw new Error('Argos Translate not installed');
      }
      
      // Get version
      const { stdout } = await execPromise('argos-translate --version');
      return stdout.trim();
    } catch (error) {
      logger.error('Error getting Argos Translate version:', error);
      throw new Error(`Failed to get Argos Translate version: ${error.message}`);
    }
  }
};

module.exports = argosService;