const db = require('../models');
const Order = db.Order;
const OrderLine = db.OrderLine;
const Item = db.Item;
const User = db.User;
const Customer = db.Customer;
const EmailNotification = db.EmailNotification;
const sendEmail = require('../utils/sendEmail');

const formatCurrency = (value) => `₱${Number(value || 0).toFixed(2)}`;

const escapePdfText = (text) => String(text || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const formatReceiptDateTime = (inputDate = new Date()) => {
    const date = new Date(inputDate);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}/${day}/${year} ${hours}:${minutes}`;
};

const buildReceiptPdf = ({ orderId, customerName, address, items, shippingFee, total, paymentMethod }) => {
    const subtotal = items.reduce((sum, item) => sum + Number(item.total || Number(item.price || 0) * Number(item.quantity || 0)), 0);
    const lines = [
        'RECEIPT',
        `No. ${String(orderId || '').padStart(6, '0')}`,
        'RetroClick',
        'Vintage Camera Marketplace',
        '----------------------------------------',
        `DATE: ${formatReceiptDateTime()}`,
        `CUSTOMER: ${customerName}`,
        `PAYMENT: ${paymentMethod || 'COD'}`,
        `ADDRESS: ${address}`,
        '----------------------------------------',
        'ITEMS',
        '',
    ];

    items.forEach((item, index) => {
        lines.push(`${index + 1}. ${item.name}`);
        lines.push(`    ${Number(item.quantity || 0)} x ${formatCurrency(item.price)}    ${formatCurrency(item.total || item.price * item.quantity)}`);
    });

    lines.push('', '----------------------------------------');
    lines.push(`SUBTOTAL: ${formatCurrency(subtotal)}`);
    lines.push(`SHIPPING: ${formatCurrency(shippingFee)}`);
    lines.push(`TOTAL: ${formatCurrency(total)}`);
    lines.push('', 'Thank you!', '');

    const contentLines = lines.map((line) => `(${escapePdfText(line)}) Tj\n0 -14 Td`);
    const contentStream = `BT\n/F1 11 Tf\n72 760 Td\n${contentLines.join('\n')}\nET`;

    const objects = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
        `<< /Length ${Buffer.byteLength(contentStream, 'utf8')} >>\nstream\n${contentStream}\nendstream`,
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
    ];

    const pdfParts = ['%PDF-1.4\n'];
    const offsets = [];

    objects.forEach((obj, index) => {
        offsets.push(pdfParts.join('').length);
        pdfParts.push(`${index + 1} 0 obj\n`);
        pdfParts.push(`${obj}\n`);
        pdfParts.push('endobj\n');
    });

    const xrefOffset = pdfParts.join('').length;
    pdfParts.push(`xref\n0 ${objects.length + 1}\n`);
    pdfParts.push('0000000000 65535 f \n');
    offsets.forEach((offset) => {
        pdfParts.push(`${String(offset).padStart(10, '0')} 00000 n \n`);
    });
    pdfParts.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

    return Buffer.from(pdfParts.join(''), 'utf8');
};

const createNotificationRecord = async ({ orderId, userId, email, subject, body, status, errorMessage }) => {
    try {
        await EmailNotification.create({
            orderinfo_id: orderId,
            user_id: userId,
            recipient_email: email,
            subject,
            body,
            status,
            sent_at: status === 'Sent' ? new Date() : null,
            error_message: errorMessage || null
        });
    } catch (notificationError) {
        console.log('Notification logging error:', notificationError.message);
    }
};

const sendOrderEmail = async ({ orderId, recipientEmail, recipientName, subject, html, attachments = [] }) => {
    if (!recipientEmail) {
        return;
    }

    try {
        await sendEmail({
            email: recipientEmail,
            subject,
            html,
            attachments
        });

        await createNotificationRecord({
            orderId,
            userId: null,
            email: recipientEmail,
            subject,
            body: html,
            status: 'Sent'
        });
    } catch (emailError) {
        console.log('Email error:', emailError.message);
        await createNotificationRecord({
            orderId,
            userId: null,
            email: recipientEmail,
            subject,
            body: html,
            status: 'Failed',
            errorMessage: emailError.message
        });
    }
};

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

        const fullName = [customer.fname, customer.lname].filter(Boolean).join(' ').trim() || userRecord.name || 'Customer';
        const deliveryAddress = [customer.addressline, customer.zipcode].filter(Boolean).join(', ') || shippingData.address1 || 'To be confirmed';
        const orderItems = cart.map((item) => ({
            name: item.name || item.description || `Item #${item.item_id}`,
            quantity: Number(item.quantity || 0),
            price: Number(item.price || 0),
            total: Number(item.price || 0) * Number(item.quantity || 0)
        }));
        const receiptPdf = buildReceiptPdf({
            orderId: order.orderinfo_id,
            customerName: fullName,
            address: deliveryAddress,
            items: orderItems,
            shippingFee: Number(shippingFee || 0),
            total,
            paymentMethod
        });

        if (userRecord && userRecord.email) {
            const html = `
                <h2>Order Confirmation</h2>
                <p>Hi ${fullName},</p>
                <p>Your order #${order.orderinfo_id} has been placed successfully.</p>
                <p><strong>Total:</strong> ${formatCurrency(total)}</p>
                <p>We have attached your receipt with the delivery details.</p>
            `;
            await sendOrderEmail({
                orderId: order.orderinfo_id,
                recipientEmail: userRecord.email,
                recipientName: fullName,
                subject: 'Order Confirmation - RetroClick',
                html,
                attachments: [{
                    filename: `receipt-${order.orderinfo_id}.pdf`,
                    content: receiptPdf,
                    contentType: 'application/pdf'
                }]
            });
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

        const previousStatus = order.status;
        await Order.update(updateData, { where: { orderinfo_id: id } });

        if (status !== undefined && updateData.status && ['Processing', 'Completed'].includes(updateData.status) && previousStatus !== updateData.status) {
            const customer = await Customer.findOne({ where: { customer_id: order.customer_id } });
            const linkedUser = customer?.user_id ? await User.findOne({
                where: { id: customer.user_id },
                attributes: ['id', 'name', 'email'],
                raw: true
            }) : null;

            if (linkedUser?.email) {
                const html = `
                    <h2>Order Update</h2>
                    <p>Hi ${linkedUser.name || 'Customer'},</p>
                    <p>Your order #${order.orderinfo_id} is now <strong>${updateData.status}</strong>.</p>
                    <p>Thank you for shopping with RetroClick.</p>
                `;
                await sendOrderEmail({
                    orderId: order.orderinfo_id,
                    recipientEmail: linkedUser.email,
                    recipientName: linkedUser.name || 'Customer',
                    subject: `Order ${updateData.status} - RetroClick`,
                    html
                });
            }
        }

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
