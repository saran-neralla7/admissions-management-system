import multer from 'multer';
import path from 'path';

const tempStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.STORAGE_DIR || './storage');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'temp-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter enforcing PDF, JPG, JPEG, PNG only, max 5MB
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];

  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only PDF, JPG, JPEG, and PNG files are allowed.'));
  }
};

export const upload = multer({
  storage: tempStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: fileFilter,
});
