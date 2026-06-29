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
        // Fetch orders with raw query
        const orders = await Order.findAll({
            raw: true,
            order: [['orderinfo_id', 'DESC']]
        });

        // Fetch customer and user data for each order
        const mappedOrders = await Promise.all(orders.map(async (order) => {
            try {
                const customer = await Customer.findOne({ 
                    where: { customer_id: order.customer_id },
                    raw: true 
                });
                
                let user = null;
                if (customer && customer.user_id) {
                    user = await User.findOne({
                        where: { id: customer.user_id },
                        attributes: ['id', 'name', 'email'],
                        raw: true
                    });
                }
                
                return {
                    id: order.orderinfo_id,
                    customer_id: order.customer_id,
                    total: order.total,
                    status: order.status,
                    created_at: order.date_placed,
                    User: user
                };
            } catch (err) {
                console.log('Error mapping order:', err.message);
                return {
                    id: order.orderinfo_id,
                    customer_id: order.customer_id,
                    total: order.total,
                    status: order.status,
                    created_at: order.date_placed,
                    User: null
                };
            }
        }));

        return res.status(200).json({ 
            success: true,
            rows: mappedOrders
        });
    } catch (error) {
        console.log('getAllOrders error:', error.message);
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
                { 
                    model: Customer,
                    include: [{ model: User, attributes: ['id', 'name', 'email'] }]
                }
            ]
        });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Map the response to match frontend expectations
        const mappedOrder = {
            id: order.orderinfo_id,
            customer_id: order.customer_id,
            total: order.total,
            status: order.status,
            created_at: order.date_placed,
            User: order.Customer ? order.Customer.User : null,
            OrderLines: order.OrderLines
        };

        return res.status(200).json({ success: true, result: mappedOrder });
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

        // Get customer ID from user ID
        const customer = await Customer.findOne({ where: { user_id: user.id } });
        if (!customer) {
            return res.status(400).json({ error: 'Customer record not found for this user' });
        }

        // Calculate total amount
        let total = 0;
        for (const item of cart) {
            total += item.price * item.quantity;
        }

        // Create order using the correct field names
        const order = await Order.create({
            customer_id: customer.customer_id,
            total,
            order_items: cart,
            status: 'Pending'
        });

        // Create order lines
        for (const item of cart) {
            await OrderLine.create({
                orderinfo_id: order.orderinfo_id,
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
                    message: `Your order #${order.orderinfo_id} has been placed successfully. Total: ₱${total.toFixed(2)}`
                });
            } catch (emailErr) {
                console.log('Email error:', emailErr);
            }
        }

        return res.status(201).json({
            success: true,
            message: 'Order created successfully',
            order_id: order.orderinfo_id,
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
        const { total, total_amount, status } = req.body;

        const order = await Order.findByPk(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const updateData = {};
        if (total !== undefined) {
            updateData.total = total;
        } else if (total_amount !== undefined) {
            updateData.total = total_amount;
        }
        if (status !== undefined) updateData.status = status;

        await Order.update(updateData, { where: { orderinfo_id: id } });

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
        await OrderLine.destroy({ where: { orderinfo_id: id } });
        
        // Delete order
        await Order.destroy({ where: { orderinfo_id: id } });

        return res.status(200).json({
            success: true,
            message: 'Order deleted successfully'
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error deleting order', details: error.message });
    }
};
