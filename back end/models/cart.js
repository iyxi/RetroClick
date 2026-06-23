module.exports = (sequelize, DataTypes) => {
    const Cart = sequelize.define('Cart', {
        cart_id: {
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
        status: {
            type: DataTypes.ENUM('active', 'checked_out', 'abandoned'),
            allowNull: false,
            defaultValue: 'active'
        }
    }, {
        tableName: 'cart',
        timestamps: true,
        underscored: true
    });

    return Cart;
};
