const db = require('../models');
const Media = db.Media;

exports.getAllMedia = async (req, res) => {
    try {
        const { type } = req.query;
        const where = {};
        if (type) where.file_type = type;
        const rows = await Media.findAll({ where, order: [['created_at', 'DESC']] });
        return res.status(200).json({ success: true, rows });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error fetching media', details: error.message });
    }
};

exports.getSingleMedia = async (req, res) => {
    try {
        const { id } = req.params;
        const row = await Media.findByPk(id);
        if (!row) return res.status(404).json({ success: false, message: 'Not found' });
        return res.status(200).json({ success: true, result: row });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error fetching media', details: error.message });
    }
};

exports.createMedia = async (req, res) => {
    try {
        // expects files in req.files and optional title
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const created = [];
        for (const f of req.files) {
            const ext = (f.mimetype || '').includes('mpeg') || f.originalname.toLowerCase().endsWith('.mp3') ? 'mp3' : 'mp4';
            const media = await Media.create({
                title: req.body.title || f.originalname,
                filename: f.originalname,
                file_path: f.path.replace(/\\/g, '/'),
                file_type: ext,
                uploaded_by: req.user?.id || null
            });
            created.push(media);
        }

        return res.status(201).json({ success: true, created });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error uploading media', details: error.message });
    }
};

exports.updateMedia = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, is_visible } = req.body;
        const media = await Media.findByPk(id);
        if (!media) return res.status(404).json({ success: false, message: 'Not found' });
        await media.update({ title: title ?? media.title, is_visible: is_visible !== undefined ? !!JSON.parse(is_visible) : media.is_visible });
        return res.status(200).json({ success: true, result: media });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error updating media', details: error.message });
    }
};

exports.deleteMedia = async (req, res) => {
    try {
        const { id } = req.params;
        const media = await Media.findByPk(id);
        if (!media) return res.status(404).json({ success: false, message: 'Not found' });
        await media.destroy();
        return res.status(200).json({ success: true, message: 'Deleted' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error deleting media', details: error.message });
    }
};
