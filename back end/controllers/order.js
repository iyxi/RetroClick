const db = require('../models');
const Order = db.Order;
const OrderLine = db.OrderLine;
const Item = db.Item;
const User = db.User;
const Customer = db.Customer;
const sendEmail = require('../utils/sendEmail');

// Get all orders with details
exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.findAll({
            include: [
                { 
                    model: OrderLine, 
                    include: [{ model: Item, attributes: ['item_id', 'description', 'sell_price'] }] 
                },
                { model: User, attributes: ['id', 'name', 'email'] }
            ],
            order: [['created_at', 'DESC']]
        });

        return res.status(200).json({ 
            success: true,
            rows: orders 
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error fetching orders', details: error.message });
    }
};

// Get single order
exports.getSingleOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await Order.findByPk(id, {
            include: [
                { 
                    model: OrderLine, 
                    include: [{ model: Item, attributes: ['item_id', 'description', 'sell_price'] }] 
                },
                { model: User, attributes: ['id', 'name', 'email'] }
            ]
        });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        return res.status(200).json({ success: true, result: order });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error fetching order', details: error.message });
    }
};

// Create order
exports.createOrder = async (req, res) => {
    try {
        const { cart, user } = req.body;

        if (!user || !user.id || !cart || cart.length === 0) {
            return res.status(400).json({ error: 'User ID and cart items are required' });
        }

        // Calculate total amount
        let total_amount = 0;
        for (const item of cart) {
            total_amount += item.price * item.quantity;
        }

        // Create order
        const order = await Order.create({
            user_id: user.id,
            total_amount,
            status: 'pending'
        });

        // Create order lines
        for (const item of cart) {
            await OrderLine.create({
                order_id: order.id,
                item_id: item.item_id,
                quantity: item.quantity,
                unit_price: item.price
            });
        }

        // Get user email and send confirmation
        const userRecord = await User.findByPk(user.id);
        if (userRecord && userRecord.email) {
            try {
                await sendEmail({
                    email: userRecord.email,
                    subject: 'Order Confirmation - RetroClick',
                    message: `Your order #${order.id} has been placed successfully. Total: ₱${total_amount.toFixed(2)}`
                });
            } catch (emailErr) {
                console.log('Email error:', emailErr);
            }
        }

        return res.status(201).json({
            success: true,
            message: 'Order created successfully',
            order_id: order.id,
            order
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error creating order', details: error.message });
    }
};

// Update order
exports.updateOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { total_amount, status } = req.body;

        const order = await Order.findByPk(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const updateData = {};
        if (total_amount !== undefined) updateData.total_amount = total_amount;
        if (status !== undefined) updateData.status = status;

        await Order.update(updateData, { where: { id } });

        return res.status(200).json({
            success: true,
            message: 'Order updated successfully'
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error updating order', details: error.message });
    }
};

// Delete order
exports.deleteOrder = async (req, res) => {
    try {
        const { id } = req.params;

        // Delete order lines first
        await OrderLine.destroy({ where: { order_id: id } });
        
        // Delete order
        await Order.destroy({ where: { id } });

        return res.status(200).json({
            success: true,
            message: 'Order deleted successfully'
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error deleting order', details: error.message });
    }
};
