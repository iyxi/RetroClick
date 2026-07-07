const db = require('../models');
const Cart = db.Cart;
const CartItem = db.CartItem;
const Item = db.Item;
const Customer = db.Customer;

const getCustomerForUser = async (userId) => {
    const [customer] = await Customer.findOrCreate({
        where: { user_id: userId },
        defaults: {
            user_id: userId,
            fname: null,
            lname: null,
            addressline: null,
            zipcode: null,
            phone: null,
            image_path: null
        }
    });
    return customer;
};

const getOrCreateActiveCart = async (customer_id) => {
    const [cart] = await Cart.findOrCreate({
        where: { customer_id, status: 'active' }
    });
    return cart;
};

const buildCartResponse = async (cart) => {
    const cartItems = await CartItem.findAll({
        where: { cart_id: cart.cart_id },
        include: [{
            model: Item,
            attributes: ['item_id', 'camera_brand', 'camera_model', 'description', 'sell_price', 'img_path']
        }]
    });

    return cartItems.map((cartItem) => {
        const item = cartItem.Item || {};
        let image = item.img_path || null;
        if (typeof image === 'string') {
            try {
                const parsed = JSON.parse(image);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    image = parsed[0];
                }
            } catch (err) {
                // keep raw image path if not JSON
            }
        }
        return {
            cart_item_id: cartItem.cart_item_id,
            cart_id: cartItem.cart_id,
            item_id: cartItem.item_id,
            quantity: cartItem.quantity,
            description: item.description || `${item.camera_brand || ''} ${item.camera_model || ''}`.trim() || `Item #${cartItem.item_id}`,
            price: Number(item.sell_price || 0),
            image: image || null,
            meta: [item.camera_brand, item.camera_model].filter(Boolean).join(' '),
            selected: true
        };
    });
};

exports.getCart = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const customer = await getCustomerForUser(userId);
        const cart = await getOrCreateActiveCart(customer.customer_id);
        const items = await buildCartResponse(cart);
        return res.status(200).json({ success: true, cart: items });
    } catch (error) {
        console.error('getCart error:', error);
        return res.status(500).json({ error: 'Unable to fetch cart', details: error.message });
    }
};

exports.updateCart = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const items = Array.isArray(req.body.items) ? req.body.items : [];
        const customer = await getCustomerForUser(userId);
        const cart = await getOrCreateActiveCart(customer.customer_id);

        await CartItem.destroy({ where: { cart_id: cart.cart_id } });

        const createPromises = items
            .filter(item => item && Number(item.item_id) > 0 && Number(item.quantity) > 0)
            .map(item => CartItem.create({
                cart_id: cart.cart_id,
                item_id: Number(item.item_id),
                quantity: Number(item.quantity)
            }));

        await Promise.all(createPromises);
        const updatedItems = await buildCartResponse(cart);
        return res.status(200).json({ success: true, cart: updatedItems });
    } catch (error) {
        console.error('updateCart error:', error);
        return res.status(500).json({ error: 'Unable to update cart', details: error.message });
    }
};

exports.clearCart = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const customer = await getCustomerForUser(userId);
        const cart = await getOrCreateActiveCart(customer.customer_id);
        await CartItem.destroy({ where: { cart_id: cart.cart_id } });
        return res.status(200).json({ success: true, cart: [] });
    } catch (error) {
        console.error('clearCart error:', error);
        return res.status(500).json({ error: 'Unable to clear cart', details: error.message });
    }
};
