
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname).toLowerCase()}`;
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedExtensions = [".png", ".jpg", ".jpeg"];
    const extension = path.extname(file.originalname).toLowerCase();
    const allowedMimeTypes = ["image/png", "image/jpeg"];

    if (
        allowedExtensions.includes(extension) &&
        allowedMimeTypes.includes(file.mimetype)
    ) {
        cb(null, true);
    } else {
        cb(new Error("Only PNG, JPG, and JPEG images are allowed."));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024
    }
});

module.exports = upload;
