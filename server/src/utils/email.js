const nodemailer = require('nodemailer');
const { logger } = require('./logger');

/**
 * Email utility for sending emails
 * @param {Object} options - Email options
 * @param {String} options.email - Recipient email
 * @param {String} options.subject - Email subject
 * @param {String} options.message - Email text content
 * @param {String} options.html - Email HTML content (optional)
 * @returns {Promise} - Nodemailer sending result
 */
const sendEmail = async (options) => {
  try {
    // Create transporter based on environment
    let transporter;
    
    if (process.env.NODE_ENV === 'production') {
      // Production transporter (e.g. SendGrid, AWS SES, etc.)
      if (process.env.EMAIL_SERVICE === 'sendgrid') {
        transporter = nodemailer.createTransport({
          service: 'SendGrid',
          auth: {
            user: process.env.SENDGRID_USERNAME,
            pass: process.env.SENDGRID_PASSWORD
          }
        });
      } else if (process.env.EMAIL_SERVICE === 'ses') {
        // AWS SES configuration
        const AWS = require('aws-sdk');
        const ses = new AWS.SES({
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          region: process.env.AWS_REGION
        });
        
        transporter = nodemailer.createTransport({
          SES: ses
        });
      } else {
        // Generic SMTP
        transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: process.env.EMAIL_PORT,
          secure: process.env.EMAIL_SECURE === 'true',
          auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD
          }
        });
      }
    } else {
      // Development transporter (e.g. Mailtrap or ethereal)
      transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.mailtrap.io',
        port: process.env.EMAIL_PORT || 2525,
        auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD
        }
      });
    }

    // Prepare email with HTML fallback to text
    let htmlContent = options.html;
    if (!htmlContent && options.message) {
      // Convert plain text to basic HTML if no HTML is provided
      htmlContent = options.message
        .replace(/\n/g, '<br>')
        .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
    }

    // Email options
    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: htmlContent
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    logger.info(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error('Email sending error:', error);
    throw error;
  }
};

/**
 * Send template email
 * @param {Object} options - Template email options
 * @param {String} options.email - Recipient email
 * @param {String} options.subject - Email subject
 * @param {String} options.template - Template name
 * @param {Object} options.data - Template data
 * @returns {Promise} - Email sending result
 */
const sendTemplateEmail = async (options) => {
  try {
    // Check if template engine is available
    const fs = require('fs').promises;
    const path = require('path');
    const handlebars = require('handlebars');

    // Get template file
    const templatePath = path.join(__dirname, `../templates/emails/${options.template}.html`);
    const templateContent = await fs.readFile(templatePath, 'utf-8');

    // Compile template
    const compiledTemplate = handlebars.compile(templateContent);
    const html = compiledTemplate(options.data);

    // Send email with rendered HTML
    return await sendEmail({
      email: options.email,
      subject: options.subject,
      message: options.data.textContent || '', // Fallback text content
      html
    });
  } catch (error) {
    logger.error('Template email error:', error);
    throw error;
  }
};

module.exports = {
  sendEmail,
  sendTemplateEmail
};