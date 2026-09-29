const { cloudinary, isConfigured } = require('../config/cloudinary');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

// The message shown to end users on any upload failure. Deliberately generic
// - a farmer/buyer uploading a photo should never see internal config detail
// (env var names, the misconfigured cloud_name, SDK internals). The actual
// cause is logged server-side (see below) for whoever can fix the deployment
// config; it is never sent in the HTTP response.
const GENERIC_UPLOAD_ERROR = 'File upload is temporarily unavailable. Please try again later.';

// Cloudinary config errors (a bad cloud_name/api_key/api_secret) surface as a
// plain error from the SDK with no HTTP status the global error handler
// recognizes, so without this they were falling through to an opaque
// "Internal server error" 500. The detailed cause is logged here (never
// including the actual api_secret value, which Cloudinary's own SDK errors
// don't echo back) so it's debuggable without exposing it to the client.
function normalizeCloudinaryError(err) {
  const message = err?.message || 'Upload failed';
  if (/invalid cloud_name|invalid api_key|invalid signature/i.test(message)) {
    logger.error(
      `Cloudinary misconfigured: ${message}. Check CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET match the actual Cloudinary account.`
    );
  } else {
    logger.error(`Cloudinary upload failed: ${message}`);
  }
  return new ApiError(502, GENERIC_UPLOAD_ERROR);
}

function uploadBufferToCloudinary(buffer, { folder, resourceType = 'image' }) {
  return new Promise((resolve, reject) => {
    try {
      const stream = cloudinary.uploader.upload_stream({ folder, resource_type: resourceType }, (err, result) => {
        if (err) return reject(normalizeCloudinaryError(err));
        resolve(result);
      });
      stream.end(buffer);
    } catch (err) {
      reject(normalizeCloudinaryError(err));
    }
  });
}

/**
 * Uploads one or more image buffers (from multer memoryStorage) to Cloudinary
 * and returns their secure URLs. Fails clearly (logged server-side, generic
 * to the caller) if CLOUDINARY_* env vars haven't been configured yet, rather
 * than failing obscurely.
 */
async function uploadImages(files, folder) {
  if (!isConfigured) {
    logger.error('Image upload attempted but Cloudinary is not configured (missing CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET).');
    throw new ApiError(503, GENERIC_UPLOAD_ERROR);
  }
  const results = await Promise.all(files.map((file) => uploadBufferToCloudinary(file.buffer, { folder })));
  return results.map((r) => r.secure_url);
}

/**
 * Uploads a single chat attachment (image, voice note, or document) and
 * returns its secure URL plus a simplified `kind` for the Message.type field.
 */
async function uploadChatAttachment(file, folder) {
  if (!isConfigured) {
    logger.error('File upload attempted but Cloudinary is not configured (missing CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET).');
    throw new ApiError(503, GENERIC_UPLOAD_ERROR);
  }
  const isImage = file.mimetype.startsWith('image/');
  const isAudio = file.mimetype.startsWith('audio/');
  const resourceType = isImage ? 'image' : 'auto';
  const result = await uploadBufferToCloudinary(file.buffer, { folder, resourceType });
  return { url: result.secure_url, kind: isImage ? 'image' : isAudio ? 'voice' : 'file' };
}

module.exports = { uploadImages, uploadChatAttachment };
