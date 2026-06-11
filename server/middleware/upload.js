const multer = require('multer');
const path   = require('path');

const ALLOWED_EXT  = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.doc', '.docx'];
const ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg', 'image/png', 'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXT.includes(ext) && ALLOWED_MIME.includes(file.mimetype)) return cb(null, true);
  cb(new Error('File type not allowed. Accepted: PDF, JPG, PNG, DOC'));
};

// Hold in memory, route will write to MongoDB GridFS
module.exports = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});
