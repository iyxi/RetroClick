const db = require('../models');
const Item = db.Item;
const ItemImage = db.ItemImage;

// Get all items with images
exports.getAllItems = async (req, res) => {
    try {
        const items = await Item.findAll({
            raw: true,
            order: [['created_at', 'DESC']]
        });

        return res.status(200).json({ rows: items, success: true });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error fetching items', details: error.message });
    }
};

// Public items for storefront (only visible and available)
exports.getPublicItems = async (req, res) => {
    try {
        const items = await Item.findAll({
            raw: false,
            where: { is_visible: true, is_available: true },
            include: [{
                model: ItemImage,
                attributes: ['image_id', 'image_path', 'is_primary', 'sort_order']
            }],
            order: [[ItemImage, 'sort_order', 'ASC'], ['created_at', 'DESC']]
        });

        return res.status(200).json({ rows: items, success: true });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error fetching public items', details: error.message });
    }
};

// Get single item
exports.getSingleItem = async (req, res) => {
    try {
        const item = await Item.findByPk(req.params.id, {
            raw: false,
            include: [{
                model: ItemImage,
                attributes: ['image_id', 'image_path', 'is_primary', 'sort_order']
            }]
        });

        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        return res.status(200).json({ success: true, result: item });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error fetching item', details: error.message });
    }
};

// Create item with images and quantity
const parseBoolean = (value) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'boolean') return value;
    const normalized = String(value).trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    return undefined;
};

const parseNumber = (value, fallback = undefined) => {
    if (value === undefined || value === null || value === '') return fallback;
    const number = Number(value);
    return Number.isNaN(number) ? fallback : number;
};

exports.createItem = async (req, res, next) => {
    try {
        const { 
            description, 
            cost_price, 
            sell_price, 
            quantity,
            camera_brand,
            camera_model,
            condition,
            year_released,
            is_visible,
            is_available,
            low_stock_threshold
        } = req.body;

        // support multiple uploaded files (field name: 'images')
        let imagePath = null;
        const uploaded = req.files || [];
        const filePaths = uploaded.map(f => f.path.replace(/\\/g, "/"));
        if (filePaths.length) {
            imagePath = filePaths[0]; // primary image
        }

        const parsedCostPrice = parseNumber(cost_price, 0);
        const parsedSellPrice = parseNumber(sell_price);
        const parsedQuantity = parseNumber(quantity, 0);
        const parsedYearReleased = parseNumber(year_released, null);
        const parsedLowStockThreshold = parseNumber(low_stock_threshold, 5);
        const parsedVisible = parseBoolean(is_visible);
        const parsedAvailable = parseBoolean(is_available);

        if (!description || parsedSellPrice === undefined || !camera_brand || !camera_model) {
            return res.status(400).json({ error: 'Missing required fields: description, sell_price, camera_brand, camera_model' });
        }

        const item = await Item.create({
            description,
            cost_price: parsedCostPrice,
            sell_price: parsedSellPrice,
            camera_brand,
            camera_model,
            condition: condition || 'Good',
            year_released: parsedYearReleased,
            img_path: imagePath,
            quantity: parsedQuantity,
            low_stock_threshold: parsedLowStockThreshold,
            is_visible: parsedVisible !== undefined ? parsedVisible : true,
            is_available: parsedAvailable !== undefined ? parsedAvailable : true
        });

        if (imagePaths.length) {
            for (let i = 0; i < imagePaths.length; i++) {
                await ItemImage.create({
                    item_id: item.item_id,
                    image_path: imagePaths[i],
                    is_primary: i === 0
                });
            }
        }

        return res.status(201).json({
            success: true,
            message: 'Product created successfully',
            item_id: item.item_id,
            item
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error creating item', details: error.message });
    }
};

// Update item
exports.updateItem = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { 
            description, 
            cost_price, 
            sell_price, 
            quantity,
            camera_brand,
            camera_model,
            condition,
            year_released,
            is_visible,
            is_available,
            low_stock_threshold
        } = req.body;

        const normalizeFiles = (files) => {
            if (!files) return [];
            if (Array.isArray(files)) {
                return files;
            }
            return Object.values(files).flat();
        };

        const imageFiles = normalizeFiles(req.files);
        const imagePaths = imageFiles.map(file => file.path.replace(/\\/g, '/'));

        if (!description || !cost_price || !sell_price || !camera_brand || !camera_model) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const parsedCostPrice = parseNumber(cost_price, 0);
        const parsedSellPrice = parseNumber(sell_price);
        const parsedQuantity = parseNumber(quantity, undefined);
        const parsedYearReleased = parseNumber(year_released, null);
        const parsedLowStockThreshold = parseNumber(low_stock_threshold, undefined);
        const parsedVisible = parseBoolean(is_visible);
        const parsedAvailable = parseBoolean(is_available);

        const updateData = {
            description,
            cost_price: parsedCostPrice,
            sell_price: parsedSellPrice,
            camera_brand,
            camera_model,
            condition: condition || 'Good',
            year_released: parsedYearReleased,
            quantity: parsedQuantity,
            low_stock_threshold: parsedLowStockThreshold,
            is_visible: parsedVisible !== undefined ? parsedVisible : undefined,
            is_available: parsedAvailable !== undefined ? parsedAvailable : undefined
        };

        if (imagePaths.length) {
            updateData.img_path = JSON.stringify(imagePaths);
        }

        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        await Item.update(updateData, { where: { item_id: id } });

        if (imagePaths.length) {
            for (let i = 0; i < imagePaths.length; i++) {
                await ItemImage.create({
                    item_id: id,
                    image_path: imagePaths[i],
                    is_primary: i === 0
                });
            }
        }

        return res.status(200).json({ 
            success: true,
            message: 'Product updated successfully'
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error updating item', details: error.message });
    }
};

// Archive item
exports.archiveItem = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await Item.findByPk(id);
        if (!item) {
            return res.status(404).json({ success: false, error: 'Item not found' });
        }

        await Item.update({ is_visible: false }, { where: { item_id: id } });
        return res.status(200).json({ success: true, message: 'Product archived successfully' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error archiving item', details: error.message });
    }
};

// Restore item
exports.restoreItem = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await Item.findByPk(id);
        if (!item) {
            return res.status(404).json({ success: false, error: 'Item not found' });
        }

        await Item.update({ is_visible: true }, { where: { item_id: id } });
        return res.status(200).json({ success: true, message: 'Product restored successfully' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error restoring item', details: error.message });
    }
};

// Delete item
exports.deleteItem = async (req, res) => {
    try {
        const { id } = req.params;

            // Delete related images
        await ItemImage.destroy({ where: { item_id: id } });
        
        // Delete item
        await Item.destroy({ where: { item_id: id } });

        return res.status(200).json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error deleting item', details: error.message });
    }
};