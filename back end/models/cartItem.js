module.exports = (sequelize, DataTypes) => {
    const CartItem = sequelize.define('CartItem', {
        cart_item_id: {
            type: DataTypes.BIGINT.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        cart_id: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: {
                model: 'cart',
                key: 'cart_id'
            }
        },
        item_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: {
                model: 'item',
                key: 'item_id'
            }
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1
        }
    }, {
        tableName: 'cart_item',
        timestamps: true,
        underscored: true
    });

    return CartItem;
};
