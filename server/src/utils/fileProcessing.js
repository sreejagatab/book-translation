const fs = require('fs').promises;
const path = require('path');
const mammoth = require('mammoth');
const pdf = require('pdf-parse');
const EPub = require('epub');
const { logger } = require('./logger');

/**
 * File processing utilities
 */
const fileProcessing = {
  /**
   * Extract text from different file formats
   * @param {string} filePath - Path to the file
   * @param {string} fileFormat - File format (pdf, epub, txt, docx)
   * @returns {Promise<string>} - Extracted text
   */
  async extractText(filePath, fileFormat) {
    try {
      logger.info(`Extracting text from ${filePath} (${fileFormat})`);
      
      switch (fileFormat.toLowerCase()) {
        case 'pdf':
          return await this.extractFromPDF(filePath);
        case 'epub':
          return await this.extractFromEPUB(filePath);
        case 'docx':
          return await this.extractFromDOCX(filePath);
        case 'txt':
          return await this.extractFromTXT(filePath);
        default:
          throw new Error(`Unsupported file format: ${fileFormat}`);
      }
    } catch (error) {
      logger.error(`Error extracting text from ${filePath}:`, error);
      throw new Error(`Failed to extract text: ${error.message}`);
    }
  },

  /**
   * Extract text from PDF file
   * @param {string} filePath - Path to PDF file
   * @returns {Promise<string>} - Extracted text
   */
  async extractFromPDF(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdf(dataBuffer);
      return data.text;
    } catch (error) {
      logger.error('PDF extraction error:', error);
      throw new Error(`PDF extraction failed: ${error.message}`);
    }
  },

  /**
   * Extract text from EPUB file
   * @param {string} filePath - Path to EPUB file
   * @returns {Promise<string>} - Extracted text
   */
  async extractFromEPUB(filePath) {
    return new Promise((resolve, reject) => {
      const epub = new EPub(filePath);
      
      epub.on('error', err => {
        reject(new Error(`EPUB extraction failed: ${err.message}`));
      });
      
      epub.on('end', () => {
        let chapters = [];
        let chapterCount = 0;
        
        epub.flow.forEach(chapter => {
          if (chapter.id) {
            chapterCount++;
            epub.getChapter(chapter.id, (err, text) => {
              if (err) {
                reject(new Error(`Failed to get chapter ${chapter.id}: ${err.message}`));
                return;
              }
              
              // Basic HTML to text conversion
              const plainText = text.replace(/<[^>]*>/g, ' ')
                                    .replace(/\s+/g, ' ')
                                    .trim();
              
              chapters.push(plainText);
              
              if (chapters.length === chapterCount) {
                resolve(chapters.join('\n\n'));
              }
            });
          }
        });
      });
      
      epub.parse();
    });
  },

  /**
   * Extract text from DOCX file
   * @param {string} filePath - Path to DOCX file
   * @returns {Promise<string>} - Extracted text
   */
  async extractFromDOCX(filePath) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (error) {
      logger.error('DOCX extraction error:', error);
      throw new Error(`DOCX extraction failed: ${error.message}`);
    }
  },

  /**
   * Extract text from TXT file
   * @param {string} filePath - Path to TXT file
   * @returns {Promise<string>} - Extracted text
   */
  async extractFromTXT(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return data;
    } catch (error) {
      logger.error('TXT extraction error:', error);
      throw new Error(`TXT extraction failed: ${error.message}`);
    }
  },

  /**
   * Split text into chunks for translation
   * @param {string} text - Text to split
   * @param {number} chunkSize - Maximum chunk size in characters
   * @returns {Array<string>} - Array of text chunks
   */
  splitIntoChunks(text, chunkSize = 1000) {
    // Try to split at sentence boundaries
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    const chunks = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length <= chunkSize) {
        currentChunk += sentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        
        // If a single sentence is longer than the chunk size, split it
        if (sentence.length > chunkSize) {
          const sentenceChunks = this.splitLongSentence(sentence, chunkSize);
          chunks.push(...sentenceChunks.slice(0, -1));
          currentChunk = sentenceChunks[sentenceChunks.length - 1];
        } else {
          currentChunk = sentence;
        }
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  },

  /**
   * Split a long sentence into smaller chunks
   * @param {string} sentence - Sentence to split
   * @param {number} chunkSize - Maximum chunk size
   * @returns {Array<string>} - Array of sentence chunks
   */
  splitLongSentence(sentence, chunkSize) {
    const words = sentence.split(/\s+/);
    const chunks = [];
    let currentChunk = '';
    
    for (const word of words) {
      if ((currentChunk + ' ' + word).length <= chunkSize) {
        currentChunk += (currentChunk ? ' ' : '') + word;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        currentChunk = word;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  },

  /**
   * Convert translated text back to the original format
   * @param {string} text - Translated text
   * @param {string} outputPath - Output file path
   * @param {string} format - Target format (pdf, epub, txt, docx)
   * @param {Object} metadata - Metadata for the output file
   * @returns {Promise<string>} - Path to the converted file
   */
  async convertToTargetFormat(text, outputPath, format, metadata = {}) {
    try {
      const dir = path.dirname(outputPath);
      await fs.mkdir(dir, { recursive: true });
      
      switch (format.toLowerCase()) {
        case 'txt':
          await fs.writeFile(outputPath, text, 'utf8');
          break;
          
        case 'pdf':
          await this.convertToPDF(text, outputPath, metadata);
          break;
          
        case 'epub':
          await this.convertToEPUB(text, outputPath, metadata);
          break;
          
        case 'docx':
          await this.convertToDOCX(text, outputPath, metadata);
          break;
          
        default:
          throw new Error(`Unsupported output format: ${format}`);
      }
      
      return outputPath;
    } catch (error) {
      logger.error(`Error converting to ${format}:`, error);
      throw new Error(`Format conversion failed: ${error.message}`);
    }
  },

  /**
   * Convert text to PDF
   * @param {string} text - Text to convert
   * @param {string} outputPath - Output file path
   * @param {Object} metadata - PDF metadata
   * @returns {Promise<void>}
   */
  async convertToPDF(text, outputPath, metadata) {
    // Using PDFKit library (install with: npm install pdfkit)
    const PDFDocument = require('pdfkit');
    const fs = require('fs');
    
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          info: {
            Title: metadata.title || 'Translated Document',
            Author: 'Book Translation App',
            CreationDate: new Date()
          }
        });
        
        const stream = fs.createWriteStream(outputPath);
        doc.pipe(stream);
        
        // Add content
        doc.fontSize(12);
        doc.text(text, {
          paragraphGap: 10,
          indent: 20,
          align: 'justify',
          columns: 1
        });
        
        doc.end();
        
        stream.on('finish', () => {
          resolve();
        });
        
        stream.on('error', (err) => {
          reject(new Error(`PDF creation error: ${err.message}`));
        });
      } catch (error) {
        reject(new Error(`PDF creation error: ${error.message}`));
      }
    });
  },

  /**
   * Convert text to EPUB
   * @param {string} text - Text to convert
   * @param {string} outputPath - Output file path
   * @param {Object} metadata - EPUB metadata
   * @returns {Promise<void>}
   */
  async convertToEPUB(text, outputPath, metadata) {
    // Using epub-gen library (install with: npm install epub-gen)
    const Epub = require('epub-gen');
    
    const options = {
      title: metadata.title || 'Translated Book',
      author: 'Book Translation App',
      publisher: 'Book Translation App',
      content: [
        {
          title: 'Content',
          data: text.replace(/\n/g, '<br>')
        }
      ],
      lang: metadata.language || 'en'
    };
    
    try {
      await new Epub(options, outputPath).promise;
    } catch (error) {
      throw new Error(`EPUB creation error: ${error.message}`);
    }
  },

  /**
   * Convert text to DOCX
   * @param {string} text - Text to convert
   * @param {string} outputPath - Output file path
   * @param {Object} metadata - DOCX metadata
   * @returns {Promise<void>}
   */
  async convertToDOCX(text, outputPath, metadata) {
    // Using docx library (install with: npm install docx)
    const { Document, Packer, Paragraph, TextRun } = require('docx');
    
    // Split text into paragraphs
    const paragraphs = text.split(/\n+/).map(para => 
      new Paragraph({
        children: [new TextRun(para)]
      })
    );
    
    // Create document
    const doc = new Document({
      title: metadata.title || 'Translated Document',
      description: 'Document translated by Book Translation App',
      creator: 'Book Translation App',
      sections: [
        {
          properties: {},
          children: paragraphs
        }
      ]
    });
    
    // Write to file
    const buffer = await Packer.toBuffer(doc);
    await fs.writeFile(outputPath, buffer);
  }
};

module.exports = fileProcessing;