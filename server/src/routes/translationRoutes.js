const express = require('express');
const router = express.Router();
const translationController = require('../controllers/translationController');
const { authenticate } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniquePrefix = `${uuidv4()}-`;
    cb(null, uniquePrefix + file.originalname);
  }
});

// File filter for allowed types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/epub+zip',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, EPUB, TXT, and DOCX are allowed.'), false);
  }
};

// Configure upload middleware
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max file size
  }
});

// Routes
router.post(
  '/',
  authenticate,
  upload.single('file'),
  translationController.startTranslation
);

router.get(
  '/',
  authenticate,
  translationController.getUserTranslations
);

router.get(
  '/:id',
  authenticate,
  translationController.getTranslationStatus
);

router.get(
  '/:id/download',
  authenticate,
  translationController.downloadTranslation
);

router.delete(
  '/:id/cancel',
  authenticate,
  translationController.cancelTranslation
);

router.delete(
  '/:id',
  authenticate,
  translationController.deleteTranslation
);

module.exports = router;