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
            raw: true,
            where: { is_visible: true, is_available: true },
            order: [['created_at', 'DESC']]
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
        const item = await Item.findByPk(req.params.id, { raw: true });

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

        if (!description || !cost_price || !sell_price || !camera_brand || !camera_model) {
            return res.status(400).json({ error: 'Missing required fields: description, cost_price, sell_price, camera_brand, camera_model' });
        }

        const item = await Item.create({
            description,
            cost_price,
            sell_price,
            camera_brand,
            camera_model,
            condition: condition || 'Good',
            year_released,
            img_path: imagePath,
            quantity: quantity !== undefined ? quantity : 0,
            low_stock_threshold: low_stock_threshold !== undefined ? low_stock_threshold : 5,
            is_visible: is_visible !== undefined ? is_visible : true,
            is_available: is_available !== undefined ? is_available : true
        });

        // Create image records if files exist
        if (filePaths.length) {
            for (let i = 0; i < filePaths.length; i++) {
                await ItemImage.create({
                    item_id: item.item_id,
                    image_path: filePaths[i],
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

        // support multiple uploaded files on update
        let imagePath = null;
        const uploaded = req.files || [];
        const filePaths = uploaded.map(f => f.path.replace(/\\/g, "/"));
        if (filePaths.length) {
            imagePath = filePaths[0];
        }

        if (!description || !cost_price || !sell_price || !camera_brand || !camera_model) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const updateData = {
            description,
            cost_price,
            sell_price,
            camera_brand,
            camera_model,
            condition: condition || 'Good',
            year_released,
            quantity: quantity !== undefined ? quantity : undefined,
            low_stock_threshold: low_stock_threshold !== undefined ? low_stock_threshold : undefined,
            is_visible: is_visible !== undefined ? is_visible : true,
            is_available: is_available !== undefined ? is_available : true
        };

        if (imagePath) {
            updateData.img_path = imagePath;
        }

        // If multiple files uploaded, create ItemImage records
        if (filePaths.length) {
            for (let i = 0; i < filePaths.length; i++) {
                await ItemImage.create({
                    item_id: id,
                    image_path: filePaths[i],
                    is_primary: i === 0
                });
            }
        }

        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        await Item.update(updateData, { where: { item_id: id } });

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