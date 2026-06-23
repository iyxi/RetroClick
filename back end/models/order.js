module.exports = (sequelize, DataTypes) => {
    const Order = sequelize.define('Order', {
        orderinfo_id: {
            type: DataTypes.BIGINT.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        customer_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: {
                model: 'customer',
                key: 'customer_id'
            }
        },
        date_placed: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        date_shipped: {
            type: DataTypes.DATE,
            allowNull: true
        },
        shipping: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0.00
        },
        subtotal: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0.00
        },
        total_amount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0.00
        },
        status: {
            type: DataTypes.ENUM('Pending', 'Processing', 'Shipped', 'Completed', 'Cancelled'),
            allowNull: false,
            defaultValue: 'Pending'
        },
        payment_method: {
            type: DataTypes.ENUM('GCash', 'Card', 'COD'),
            allowNull: true
        },
        notes: {
            type: DataTypes.STRING(255),
            allowNull: true
        }
    }, {
        tableName: 'orderinfo',
        timestamps: true,
        createdAt: false,
        updatedAt: 'updated_at',
        underscored: true
    });

    return Order;
};
