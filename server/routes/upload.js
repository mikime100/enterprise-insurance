const express    = require('express');
const router     = express.Router();
const path       = require('path');
const crypto     = require('crypto');
const mongoose   = require('mongoose');
const { GridFSBucket } = require('mongodb');
const upload     = require('../middleware/upload');
const { requireAuth } = require('../middleware/auth');

// POST /api/upload — stores file in MongoDB GridFS (survives Render restarts)
router.post('/', requireAuth, upload.single('file'), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  try {
    const ext      = path.extname(req.file.originalname).toLowerCase();
    const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;

    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    const stream = bucket.openUploadStream(filename, {
      metadata: {
        originalName: req.file.originalname,
        mimeType:     req.file.mimetype,
        size:         req.file.size,
      },
    });

    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error',  reject);
      stream.end(req.file.buffer);
    });

    res.json({
      url:          `/api/uploads/${filename}`,
      filename,
      originalName: req.file.originalname,
      mimeType:     req.file.mimetype,
      size:         req.file.size,
    });
  } catch (err) { next(err); }
});

// GET /api/uploads/:filename — stream file back from GridFS
router.get('/:filename', async (req, res, next) => {
  try {
    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    const files  = await bucket.find({ filename: req.params.filename }).toArray();
    if (!files.length) return res.status(404).json({ message: 'File not found' });

    const meta = files[0].metadata || {};
    res.setHeader('Content-Type', meta.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${meta.originalName || req.params.filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    bucket.openDownloadStreamByName(req.params.filename).pipe(res);
  } catch (err) { next(err); }
});

// Multer error handler
router.use((err, req, res, _next) => {
  if (err?.code === 'LIMIT_FILE_SIZE')
    return res.status(400).json({ message: 'File too large. Maximum size is 5 MB.' });
  res.status(400).json({ message: err.message || 'Upload failed' });
});

module.exports = router;
