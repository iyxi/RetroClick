const multer = require("multer");
const path = require("path");


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.mp3' || ext === '.mp4' || file.mimetype.startsWith('audio') || file.mimetype.startsWith('video')) {
            cb(null, 'media');
        } else {
            cb(null, 'images');
        }
    },
    filename: function (req, file, cb) {

        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        let baseName = path.parse(file.originalname).name.replace(/\\/g, '/');
        cb(null, baseName + '-' + uniqueSuffix + ext);
        // cb(null, path.parse(file.originalname).name + '-' + uniqueSuffix + ext);
    }
});

module.exports = multer({
    storage: storage,

    fileFilter: (req, file, cb) => {
        let ext = path.extname(file.originalname).toLowerCase();
        const allowed = ['.jpg', '.jpeg', '.png', '.mp3', '.mp4'];
        if (!allowed.includes(ext)) {
            cb(new Error('Unsupported file type!'), false);
            return;
        }
        cb(null, true);
    },
});