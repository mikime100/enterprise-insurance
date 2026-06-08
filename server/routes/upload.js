const express = require('express');
const router  = express.Router();
const upload  = require('../middleware/upload');
const { requireAuth } = require('../middleware/auth');

// POST /api/upload  — single file, returns { url, filename, originalName, mimeType, size }
router.post('/', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  res.json({
    url:          `/uploads/${req.file.filename}`,
    filename:     req.file.filename,
    originalName: req.file.originalname,
    mimeType:     req.file.mimetype,
    size:         req.file.size,
  });
});

// Multer error handler
router.use((err, req, res, next) => {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File too large. Maximum size is 5 MB.' });
  }
  res.status(400).json({ message: err.message || 'Upload failed' });
});

module.exports = router;
