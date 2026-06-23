const sequelize = require('../config/database');
const Item = require('./item');
const Stock = require('./stock');
const User = require('./user');
const Customer = require('./customer');
const ItemImage = require('./itemImage');
const Order = require('./order');
const OrderLine = require('./orderLine');
const Payment = require('./payment');
const Receipt = require('./receipt');
const Cart = require('./cart');
const CartItem = require('./cartItem');
const StockRestock = require('./stockRestock');
const OrderStatusHistory = require('./orderStatusHistory');
const EmailNotification = require('./emailNotification');

// Initialize models
const db = {};
db.Item = Item(sequelize, require('sequelize').DataTypes);
db.Stock = Stock(sequelize, require('sequelize').DataTypes);
db.User = User(sequelize, require('sequelize').DataTypes);
db.Customer = Customer(sequelize, require('sequelize').DataTypes);
db.ItemImage = ItemImage(sequelize, require('sequelize').DataTypes);
db.Order = Order(sequelize, require('sequelize').DataTypes);
db.OrderLine = OrderLine(sequelize, require('sequelize').DataTypes);
db.Payment = Payment(sequelize, require('sequelize').DataTypes);
db.Receipt = Receipt(sequelize, require('sequelize').DataTypes);
db.Cart = Cart(sequelize, require('sequelize').DataTypes);
db.CartItem = CartItem(sequelize, require('sequelize').DataTypes);
db.StockRestock = StockRestock(sequelize, require('sequelize').DataTypes);
db.OrderStatusHistory = OrderStatusHistory(sequelize, require('sequelize').DataTypes);
db.EmailNotification = EmailNotification(sequelize, require('sequelize').DataTypes);

// ========== PRODUCTS & INVENTORY ==========
db.Item.hasOne(db.Stock, {
    foreignKey: 'item_id',
    onDelete: 'CASCADE'
});
db.Stock.belongsTo(db.Item, {
    foreignKey: 'item_id'
});

db.Item.hasMany(db.ItemImage, {
    foreignKey: 'item_id',
    onDelete: 'CASCADE'
});
db.ItemImage.belongsTo(db.Item, {
    foreignKey: 'item_id'
});

db.Item.hasMany(db.StockRestock, {
    foreignKey: 'item_id',
    onDelete: 'CASCADE'
});
db.StockRestock.belongsTo(db.Item, {
    foreignKey: 'item_id'
});

// ========== USERS & CUSTOMERS ==========
db.User.hasOne(db.Customer, {
    foreignKey: 'user_id',
    onDelete: 'CASCADE'
});
db.Customer.belongsTo(db.User, {
    foreignKey: 'user_id'
});

db.User.hasMany(db.StockRestock, {
    foreignKey: 'restocked_by',
    onDelete: 'SET NULL'
});
db.StockRestock.belongsTo(db.User, {
    foreignKey: 'restocked_by'
});

// ========== CARTS ==========
db.Customer.hasMany(db.Cart, {
    foreignKey: 'customer_id',
    onDelete: 'CASCADE'
});
db.Cart.belongsTo(db.Customer, {
    foreignKey: 'customer_id'
});

db.Cart.hasMany(db.CartItem, {
    foreignKey: 'cart_id',
    onDelete: 'CASCADE'
});
db.CartItem.belongsTo(db.Cart, {
    foreignKey: 'cart_id'
});

db.Item.hasMany(db.CartItem, {
    foreignKey: 'item_id',
    onDelete: 'RESTRICT'
});
db.CartItem.belongsTo(db.Item, {
    foreignKey: 'item_id'
});

// ========== ORDERS & ORDER LINES ==========
db.Customer.hasMany(db.Order, {
    foreignKey: 'customer_id',
    onDelete: 'RESTRICT'
});
db.Order.belongsTo(db.Customer, {
    foreignKey: 'customer_id'
});

db.Order.hasMany(db.OrderLine, {
    foreignKey: 'orderinfo_id',
    onDelete: 'CASCADE'
});
db.OrderLine.belongsTo(db.Order, {
    foreignKey: 'orderinfo_id'
});

db.Item.hasMany(db.OrderLine, {
    foreignKey: 'item_id',
    onDelete: 'RESTRICT'
});
db.OrderLine.belongsTo(db.Item, {
    foreignKey: 'item_id'
});

// ========== PAYMENTS & RECEIPTS ==========
db.Order.hasMany(db.Payment, {
    foreignKey: 'orderinfo_id',
    onDelete: 'CASCADE'
});
db.Payment.belongsTo(db.Order, {
    foreignKey: 'orderinfo_id'
});

db.Customer.hasMany(db.Payment, {
    foreignKey: 'customer_id',
    onDelete: 'RESTRICT'
});
db.Payment.belongsTo(db.Customer, {
    foreignKey: 'customer_id'
});

db.Order.hasOne(db.Receipt, {
    foreignKey: 'orderinfo_id',
    onDelete: 'CASCADE'
});
db.Receipt.belongsTo(db.Order, {
    foreignKey: 'orderinfo_id'
});

db.Payment.hasOne(db.Receipt, {
    foreignKey: 'payment_id',
    onDelete: 'SET NULL'
});
db.Receipt.belongsTo(db.Payment, {
    foreignKey: 'payment_id'
});

// ========== ORDER STATUS HISTORY ==========
db.Order.hasMany(db.OrderStatusHistory, {
    foreignKey: 'orderinfo_id',
    onDelete: 'CASCADE'
});
db.OrderStatusHistory.belongsTo(db.Order, {
    foreignKey: 'orderinfo_id'
});

db.User.hasMany(db.OrderStatusHistory, {
    foreignKey: 'changed_by',
    onDelete: 'SET NULL'
});
db.OrderStatusHistory.belongsTo(db.User, {
    foreignKey: 'changed_by'
});

// ========== EMAIL NOTIFICATIONS ==========
db.Order.hasMany(db.EmailNotification, {
    foreignKey: 'orderinfo_id',
    onDelete: 'SET NULL'
});
db.EmailNotification.belongsTo(db.Order, {
    foreignKey: 'orderinfo_id'
});

db.User.hasMany(db.EmailNotification, {
    foreignKey: 'user_id',
    onDelete: 'SET NULL'
});
db.EmailNotification.belongsTo(db.User, {
    foreignKey: 'user_id'
});

db.sequelize = sequelize;
db.Sequelize = require('sequelize');

module.exports = db;