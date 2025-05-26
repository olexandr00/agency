// backend/middleware/uploadMiddleware.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Визначаємо кореневу директорію проекту більш надійно
const projectRoot = path.resolve(__dirname, "..", ".."); // піднімаємось на 2 рівні з backend/middleware до кореня проекту

const EMPLOYEES_UPLOADS_DIR = path.join(
  projectRoot,
  "backend",
  "public",
  "uploads",
  "employees"
);

// Налаштування сховища для фото працівників
const employeeStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = EMPLOYEES_UPLOADS_DIR;
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (err) {
        console.error(`Error creating directory ${dir}:`, err);
        return cb(err); // Передаємо помилку в multer
      }
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      "employee-photo-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const imageFileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|gif|webp/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    // Передаємо помилку в multer, щоб він міг її обробити
    const err = new Error(
      "Дозволено завантажувати тільки зображення (jpeg, jpg, png, gif, webp)!"
    );
    err.code = "INVALID_FILE_TYPE"; // Додамо код помилки
    cb(err, false);
  }
};

const uploadEmployeePhoto = multer({
  storage: employeeStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

module.exports = { uploadEmployeePhoto };
