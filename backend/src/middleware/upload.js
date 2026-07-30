const multer = require('multer');
const ApiError = require('../utils/ApiError');
const { matchesSignature } = require('../utils/fileSignature');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const storage = multer.memoryStorage();

const imageUpload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 5 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new ApiError(400, 'Only JPEG, PNG, or WEBP images are allowed'));
    }
    cb(null, true);
  },
});

// Chat attachments: images, voice notes, and common document types.
const CHAT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'audio/webm',
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
  'application/pdf',
];
const MAX_CHAT_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const chatUpload = multer({
  storage,
  limits: { fileSize: MAX_CHAT_FILE_SIZE_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!CHAT_MIME_TYPES.includes(file.mimetype)) {
      return cb(new ApiError(400, 'Unsupported attachment type'));
    }
    cb(null, true);
  },
});

// Runs after multer (memoryStorage) has populated req.file/req.files with
// buffers - verifies the actual bytes match the claimed mimetype, since
// fileFilter above only ever saw the client-controlled Content-Type header.
function verifyFileSignature(req, res, next) {
  const files = req.files || (req.file ? [req.file] : []);
  const bad = files.find((file) => !matchesSignature(file.buffer, file.mimetype));
  if (bad) {
    return next(new ApiError(400, 'File content does not match its declared type'));
  }
  next();
}

module.exports = { imageUpload, chatUpload, verifyFileSignature };
