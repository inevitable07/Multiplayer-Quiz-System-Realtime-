import multer from "multer";
import path from "path";

/**
 * Multer storage configuration
 * Files are stored in memory as Buffer for processing
 */
const storage = multer.memoryStorage();

/**
 * File filter: Accept only .csv files
 */
const fileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimes = ["text/csv", "application/csv"];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) || fileExtension === ".csv") {
    cb(null, true);
  } else {
    cb(new Error("Only .csv files are allowed"));
  }
};

/**
 * Multer upload middleware
 * - Accepts single file
 * - Named field "file"
 * - Max size: 10MB
 */
export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

export default uploadMiddleware;
