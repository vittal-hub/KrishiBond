const { cloudinary, isConfigured } = require('../config/cloudinary');
const ApiError = require('../utils/ApiError');

function uploadBufferToCloudinary(buffer, { folder, resourceType = 'image' }) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder, resource_type: resourceType }, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });
}

/**
 * Uploads one or more image buffers (from multer memoryStorage) to Cloudinary
 * and returns their secure URLs. Throws a clear 503 if CLOUDINARY_* env vars
 * haven't been configured yet, rather than failing obscurely.
 */
async function uploadImages(files, folder) {
  if (!isConfigured) {
    throw new ApiError(503, 'Image upload is not configured yet. Set CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET.');
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
    throw new ApiError(503, 'File upload is not configured yet. Set CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET.');
  }
  const isImage = file.mimetype.startsWith('image/');
  const isAudio = file.mimetype.startsWith('audio/');
  const resourceType = isImage ? 'image' : 'auto';
  const result = await uploadBufferToCloudinary(file.buffer, { folder, resourceType });
  return { url: result.secure_url, kind: isImage ? 'image' : isAudio ? 'voice' : 'file' };
}

module.exports = { uploadImages, uploadChatAttachment };
