const multer = require('multer');
const path   = require('path');
const crypto = require('crypto');
const fs     = require('fs');

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) => {
    const id  = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${id}${ext}`);
  },
});

const ALLOWED_EXT  = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.doc', '.docx'];
const ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg', 'image/png', 'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXT.includes(ext) && ALLOWED_MIME.includes(file.mimetype)) {
    return cb(null, true);
  }
  cb(new Error(`File type not allowed. Accepted: PDF, JPG, PNG, DOC`));
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});
