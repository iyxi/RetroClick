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
                    payment_method: order.payment_method,
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
                    payment_method: order.payment_method,
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
        const cart = req.body.cart || req.body.items || [];
        const userId = req.user?.id || req.body.user?.id;
        const shippingData = req.body.shipping || {};
        const totalAmount = req.body.total;
        const shippingFee = req.body.shipping_fee ?? req.body.shippingFee ?? 0;
        const paymentMethod = req.body.payment_method || req.body.paymentMethod || 'COD';

        if (!userId || !cart || cart.length === 0) {
            return res.status(400).json({ error: 'User ID and cart items are required' });
        }

        const userRecord = await User.findOne({ where: { id: userId } });
        if (!userRecord) {
            return res.status(400).json({ error: 'User record not found for this account' });
        }

        // Get customer ID from user ID
        let customer = await Customer.findOne({ where: { user_id: userId } });
        if (!customer) {
            const fullName = String(shippingData.fullname || userRecord.name || '').trim();
            const nameParts = fullName.split(/\s+/).filter(Boolean);
            const fname = nameParts.length ? nameParts[0] : userRecord.name || 'Customer';
            const lname = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;

            customer = await Customer.create({
                user_id: userId,
                fname,
                lname,
                addressline: shippingData.address1 || null,
                zipcode: shippingData.zip || null,
                phone: null,
                image_path: null
            });
        }

        // Calculate total amount
        let subtotal = 0;
        for (const item of cart) {
            subtotal += Number(item.price || 0) * Number(item.quantity || 0);
        }
        const total = Number.isFinite(Number(totalAmount)) ? Number(totalAmount) : subtotal + Number(shippingFee || 0);

        // Create order using the correct field names
        const order = await Order.create({
            customer_id: customer.customer_id,
            total,
            shipping: Number(shippingFee || 0),
            order_items: cart,
            payment_method: paymentMethod,
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
        if (userRecord && userRecord.email) {
            try {
                await sendEmail({
                    email: userRecord.email,
                    subject: 'Order Confirmation - RetroClick',
                    message: `Your order #${order.orderinfo_id} has been placed successfully. Total: ₱${Number(total).toFixed(2)}`
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

        const order = await Order.findOne({ where: { orderinfo_id: id } });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const updateData = {};
        if (total !== undefined) {
            updateData.total = total;
        } else if (total_amount !== undefined) {
            updateData.total = total_amount;
        }
        if (status !== undefined) {
            const normalizedStatusMap = {
                pending: 'Pending',
                processing: 'Processing',
                shipped: 'Shipped',
                completed: 'Completed',
                cancelled: 'Cancelled'
            };
            const normalizedStatus = normalizedStatusMap[String(status).toLowerCase()];

            if (!normalizedStatus) {
                return res.status(400).json({ error: 'Invalid order status' });
            }

            updateData.status = normalizedStatus;
        }

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
