const db = require('../models');
const Item = db.Item;
const Stock = db.Stock;
const ItemImage = db.ItemImage;

// Get all items with stock and images
exports.getAllItems = async (req, res) => {
    try {
        const items = await Item.findAll({
            include: [
                { model: Stock },
                { model: ItemImage }
            ],
            order: [['created_at', 'DESC']]
        });
        return res.status(200).json({ rows: items, success: true });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error fetching items' });
    }
};

// Get single item with stock
exports.getSingleItem = async (req, res) => {
    try {
        const item = await Item.findByPk(req.params.id, {
            include: [
                { model: Stock },
                { model: ItemImage }
            ]
        });

        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        return res.status(200).json({ success: true, result: item });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error fetching item' });
    }
};

// Create item with stock and images
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
            is_available
        } = req.body;

        let imagePath = req.file?.path.replace(/\\/g, "/");

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
            is_visible: is_visible !== undefined ? is_visible : true,
            is_available: is_available !== undefined ? is_available : true
        });

        // Create stock record
        await Stock.create({
            item_id: item.item_id,
            quantity: quantity || 0
        });

        // Create image record if image exists
        if (imagePath) {
            await ItemImage.create({
                item_id: item.item_id,
                image_path: imagePath,
                is_primary: true
            });
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
            is_available
        } = req.body;

        let imagePath = req.file?.path.replace(/\\/g, "/");

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
            is_visible: is_visible !== undefined ? is_visible : true,
            is_available: is_available !== undefined ? is_available : true
        };

        if (imagePath) {
            updateData.img_path = imagePath;
        }

        await Item.update(updateData, { where: { item_id: id } });

        if (quantity !== undefined) {
            await Stock.update({ quantity }, { where: { item_id: id } });
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

// Delete item
exports.deleteItem = async (req, res) => {
    try {
        const { id } = req.params;

        // Delete related images
        await ItemImage.destroy({ where: { item_id: id } });
        
        // Delete stock
        await Stock.destroy({ where: { item_id: id } });
        
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
};