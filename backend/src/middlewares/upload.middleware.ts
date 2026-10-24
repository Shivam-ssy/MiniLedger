import multer from 'multer';

// Use memory storage so we can validate magic bytes before committing to disk
const storage = multer.memoryStorage();

export const uploadReceiptMiddleware = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
}).single('receipt');
