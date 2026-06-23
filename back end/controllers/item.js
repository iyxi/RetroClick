const db = require('../models');
const Item = db.Item;
const Stock = db.Stock;

// Get all items with stock
exports.getAllItems = async (req, res) => {
    try {
        const items = await Item.findAll({
            include: [{ model: Stock }]
        });
        return res.status(200).json({ rows: items });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error fetching items' });
    }
};

// Get single item with stock
exports.getSingleItem = async (req, res) => {
    try {
        const item = await Item.findByPk(req.params.id, {
            include: [{ model: Stock }]
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

// Create item with stock
exports.createItem = async (req, res, next) => {
    try {
        const { description, cost_price, sell_price, quantity } = req.body;
        let imagePath = req.file?.path.replace(/\\/g, "/");

        if (!description || !cost_price || !sell_price) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const item = await Item.create({
            description,
            cost_price,
            sell_price,
            img_path: imagePath,
            created_at: Date.now()
        });

        const stock = await Stock.create({
            item_id: item.item_id,
            quantity: quantity || 0
        });

        return res.status(201).json({
            success: true,
            itemId: item.item_id,
            image: imagePath,
            quantity,
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
        const { description, cost_price, sell_price, quantity } = req.body;
        let imagePath = req.file?.path.replace(/\\/g, "/");

        if (!description || !cost_price || !sell_price) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        await Item.update(
            {
                description,
                cost_price,
                sell_price,
                img_path: imagePath
            },
            { where: { item_id: id } }
        );

        await Stock.update(
            { quantity },
            { where: { item_id: id } }
        );

        return res.status(200).json({ success: true });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error updating item', details: error.message });
    }
};

// Delete item
exports.deleteItem = async (req, res) => {
    try {
        const { id } = req.params;

        await Stock.destroy({ where: { item_id: id } });
        await Item.destroy({ where: { item_id: id } });

        return res.status(200).json({
            success: true,
            message: 'Item deleted successfully'
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error deleting item', details: error.message });
    }
};