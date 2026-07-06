const db = require('../models');
const Order = db.Order;
const OrderLine = db.OrderLine;
const Item = db.Item;
const User = db.User;
const Customer = db.Customer;
const EmailNotification = db.EmailNotification;
const sendEmail = require('../utils/sendEmail');

const formatCurrency = (value) => `₱${Number(value || 0).toFixed(2)}`;
const formatReceiptMoney = (value) => `PHP ${Number(value || 0).toFixed(2)}`;

const escapePdfText = (text) => String(text || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const escapeHtml = (text) => String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatReceiptDateTime = (inputDate = new Date()) => {
    const date = new Date(inputDate);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}/${day}/${year} ${hours}:${minutes}`;
};

const formatReceiptOrderNo = (orderId) => String(orderId || '').padStart(6, '0');

const buildReceiptItems = (items) => items.map((item, index) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.price || 0);
    const lineTotal = Number(item.total || unitPrice * quantity);

    return {
        index: index + 1,
        name: String(item.name || '').trim() || `Item #${item.item_id || index + 1}`,
        quantity,
        unitPrice,
        lineTotal
    };
});

const buildReceiptEmailHtml = ({ orderId, customerName, addressText, shippingEmail, items, shippingFee, total, paymentMethod, placedAt, status = 'Pending' }) => {
    const normalizedItems = buildReceiptItems(items);
    const subtotal = normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const dateText = formatReceiptDateTime(placedAt);
    const normalizedStatus = String(status || 'Pending').toLowerCase();
    const statusLabel = normalizedStatus === 'completed' ? 'Completed' : normalizedStatus === 'processing' ? 'Processing' : normalizedStatus === 'cancelled' ? 'Cancelled' : 'Pending';
    const statusMessage = normalizedStatus === 'completed'
        ? 'Your order is complete. Thank you and order again soon.'
        : normalizedStatus === 'processing'
            ? 'Your order is now processing. Please wait for delivery.'
            : normalizedStatus === 'cancelled'
                ? 'Your order has been cancelled. If you need help, contact support.'
                : 'Your order is pending and will be processed shortly.';

    return `
        <div style="max-width:560px;margin:0 auto;padding:18px 16px 20px;background:#f3ead7;border:1px solid rgba(92,63,38,.25);border-radius:12px;box-shadow:0 12px 28px rgba(64,35,22,.15);font-family:Arial,Helvetica,sans-serif;color:#3c2a21;">
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;letter-spacing:.08em;font-weight:800;color:#972f2f;text-transform:uppercase;">
                <span>Receipt</span>
                <span>No. ${escapeHtml(formatReceiptOrderNo(orderId))}</span>
            </div>
            <div style="margin-top:8px;padding:12px;border:1px solid rgba(151,47,47,0.18);border-radius:10px;background:rgba(255,255,255,0.95);font-size:12px;color:#4b2f25;">
                <strong>Status:</strong> ${escapeHtml(statusLabel)}<br>
                ${escapeHtml(statusMessage)}
            </div>
            <div style="text-align:center;margin-top:10px;">
                <div style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:32px;line-height:1;color:#a3232f;">RetroClick</div>
                <div style="margin-top:2px;font-size:10px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;color:#6a4b3a;">Vintage Camera Marketplace</div>
            </div>
            <div style="border-top:2px dashed rgba(90,63,38,.46);margin:12px 0;"></div>
            <div style="font-size:11px;letter-spacing:.04em;text-transform:uppercase;line-height:1.7;">
                <div><strong>Date:</strong> ${escapeHtml(dateText)}</div>
                <div><strong>Customer:</strong> ${escapeHtml(customerName)}</div>
                <div><strong>Payment:</strong> ${escapeHtml(paymentMethod || 'COD')}</div>
                <div><strong>Email:</strong> ${escapeHtml(shippingEmail || '')}</div>
                <div><strong>Address:</strong> ${escapeHtml(addressText)}</div>
            </div>
            <div style="border-top:2px dashed rgba(90,63,38,.46);margin:12px 0;"></div>
            <div style="margin:0;padding:0;">
                ${normalizedItems.map(item => `
                    <div style="display:grid;grid-template-columns:1fr auto;gap:3px 12px;padding:8px 0;border-bottom:1px dotted rgba(90,63,38,.35);">
                        <div style="font-size:14px;font-weight:700;color:#34241c;line-height:1.2;">${escapeHtml(item.name)}</div>
                        <div style="grid-column:1/2;font-size:12px;color:#6b5142;">${item.quantity} x ${escapeHtml(formatCurrency(item.unitPrice))}</div>
                        <div style="grid-column:2/3;grid-row:1/3;align-self:center;font-size:14px;font-weight:800;color:#3a2a21;">${escapeHtml(formatCurrency(item.lineTotal))}</div>
                    </div>
                `).join('')}
            </div>
            <div style="border-top:2px dashed rgba(90,63,38,.46);margin:12px 0;"></div>
            <div style="font-size:12px;letter-spacing:.05em;text-transform:uppercase;line-height:1.8;">
                <div style="display:flex;justify-content:space-between;gap:12px;"><span>Subtotal</span><span>${escapeHtml(formatCurrency(subtotal))}</span></div>
                <div style="display:flex;justify-content:space-between;gap:12px;"><span>Shipping</span><span>${escapeHtml(formatCurrency(shippingFee))}</span></div>
                <div style="display:flex;justify-content:space-between;gap:12px;font-size:18px;font-weight:900;color:#2b1d17;border-top:2px dashed rgba(90,63,38,.5);margin-top:8px;padding-top:8px;"><span>Total:</span><span>${escapeHtml(formatCurrency(total))}</span></div>
            </div>
            <div style="margin-top:14px;text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-style:italic;font-weight:700;color:#b02b3b;line-height:1;">Thank You!</div>
        </div>
    `;
};

const buildReceiptPdf = ({ orderId, customerName, address, items, shippingFee, total, paymentMethod, placedAt, status = 'Pending' }) => {
    const normalizedItems = buildReceiptItems(items);
    const subtotal = normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const receiptWidth = 44;
    const normalizedStatus = String(status || 'Pending').toLowerCase();
    const statusLabel = normalizedStatus === 'completed' ? 'Completed' : normalizedStatus === 'processing' ? 'Processing' : normalizedStatus === 'cancelled' ? 'Cancelled' : 'Pending';
    const statusMessage = normalizedStatus === 'completed'
        ? 'Thank you and order again soon.'
        : normalizedStatus === 'processing'
            ? 'Your order is now processing.'
            : normalizedStatus === 'cancelled'
                ? 'Your order has been cancelled.'
                : 'Your order is pending and will be processed shortly.';
    const centerLine = (text) => {
        const value = String(text || '');
        if (value.length >= receiptWidth) return value;
        const leftPad = Math.floor((receiptWidth - value.length) / 2);
        return `${' '.repeat(leftPad)}${value}`;
    };
    const rule = '-'.repeat(receiptWidth);
    const lines = [
        centerLine('RECEIPT'),
        centerLine(`No. ${formatReceiptOrderNo(orderId)}`),
        centerLine('RetroClick'),
        centerLine('Vintage Camera Marketplace'),
        rule,
        `STATUS: ${statusLabel}`,
        `${statusMessage}`,
        rule,
        `DATE: ${formatReceiptDateTime(placedAt)}`,
        `CUSTOMER: ${customerName}`,
        `PAYMENT: ${paymentMethod || 'COD'}`,
        `ADDRESS: ${address}`,
        rule,
        'ITEMS',
        '',
    ];

    normalizedItems.forEach((item) => {
        lines.push(`${item.index}. ${item.name}`);
        lines.push(`   ${String(item.quantity).padStart(2, ' ')} x ${formatReceiptMoney(item.unitPrice)}   ${formatReceiptMoney(item.lineTotal)}`);
    });

    lines.push('', rule);
    lines.push(`SUBTOTAL: ${formatReceiptMoney(subtotal)}`);
    lines.push(`SHIPPING: ${formatReceiptMoney(shippingFee)}`);
    lines.push(`TOTAL: ${formatReceiptMoney(total)}`);
    lines.push('', centerLine('Thank You!'), '');

    const contentLines = lines.map((line) => `(${escapePdfText(line)}) Tj\n0 -14 Td`);
    const contentStream = `BT\n/F1 10 Tf\n72 770 Td\n${contentLines.join('\n')}\nET`;

    const objects = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
        `<< /Length ${Buffer.byteLength(contentStream, 'utf8')} >>\nstream\n${contentStream}\nendstream`,
        '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>'
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
            paymentMethod,
            placedAt: order.date_placed || new Date()
        });

        if (userRecord && userRecord.email) {
            const html = buildReceiptEmailHtml({
                orderId: order.orderinfo_id,
                customerName: fullName,
                addressText: deliveryAddress,
                shippingEmail: shippingData.email || userRecord.email,
                items: orderItems,
                shippingFee: Number(shippingFee || 0),
                total,
                paymentMethod,
                placedAt: order.date_placed || new Date(),
                status: order.status
            });
            await sendOrderEmail({
                orderId: order.orderinfo_id,
                recipientEmail: userRecord.email,
                recipientName: fullName,
                subject: `Order ${order.status} - RetroClick`,
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

        const updatedOrder = await Order.findOne({
            where: { orderinfo_id: id },
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

        if (status !== undefined && updateData.status && ['Processing', 'Completed', 'Cancelled'].includes(updateData.status) && previousStatus !== updateData.status) {
            const orderCustomer = updatedOrder.Customer;
            const linkedUser = orderCustomer?.User || null;
            const fullName = orderCustomer ? [orderCustomer.fname, orderCustomer.lname].filter(Boolean).join(' ').trim() : linkedUser?.name || 'Customer';
            const deliveryAddress = [orderCustomer?.addressline, orderCustomer?.zipcode].filter(Boolean).join(', ') || 'Address to be confirmed';
            const orderItems = (updatedOrder.OrderLines || []).map((orderLine) => ({
                name: orderLine.Item?.description || `Item #${orderLine.item_id}`,
                quantity: Number(orderLine.quantity || 0),
                price: Number(orderLine.unit_price || 0),
                total: Number(orderLine.unit_price || 0) * Number(orderLine.quantity || 0)
            }));
            const shippingFee = Number(updatedOrder.shipping || 0);
            const totalAmount = Number(updatedOrder.total || 0);
            const paymentMethod = updatedOrder.payment_method || 'COD';

            const existingReceipt = await db.Receipt.findOne({ where: { orderinfo_id: id } });
            const receiptNo = `RCT-${formatReceiptOrderNo(id)}`;

            if (!existingReceipt) {
                await db.Receipt.create({
                    orderinfo_id: id,
                    payment_id: null,
                    receipt_no: receiptNo,
                    receipt_pdf_path: null,
                    issued_at: new Date()
                });
            }

            const receiptPdf = buildReceiptPdf({
                orderId: id,
                customerName: fullName,
                address: deliveryAddress,
                items: orderItems,
                shippingFee,
                total: totalAmount,
                paymentMethod,
                placedAt: updatedOrder.date_placed || new Date(),
                status: updateData.status
            });

            const emailHtml = buildReceiptEmailHtml({
                orderId: id,
                customerName: fullName,
                addressText: deliveryAddress,
                shippingEmail: linkedUser?.email || '',
                items: orderItems,
                shippingFee,
                total: totalAmount,
                paymentMethod,
                placedAt: updatedOrder.date_placed || new Date(),
                status: updateData.status
            });

            if (linkedUser?.email) {
                await sendOrderEmail({
                    orderId: id,
                    recipientEmail: linkedUser.email,
                    recipientName: linkedUser.name || fullName,
                    subject: `Order ${updateData.status} - RetroClick`,
                    html: emailHtml,
                    attachments: [
                        {
                            filename: `receipt-${id}.pdf`,
                            content: receiptPdf,
                            contentType: 'application/pdf'
                        }
                    ]
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Order updated successfully',
            order: updatedOrder
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
