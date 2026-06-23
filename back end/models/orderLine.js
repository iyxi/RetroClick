module.exports = (sequelize, DataTypes) => {
    const OrderLine = sequelize.define('OrderLine', {
        orderline_id: {
            type: DataTypes.BIGINT.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        orderinfo_id: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: {
                model: 'orderinfo',
                key: 'orderinfo_id'
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
            allowNull: false
        },
        unit_price: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false
        }
    }, {
        tableName: 'orderline',
        timestamps: true,
        createdAt: true,
        updatedAt: false,
        underscored: true
    });

    return OrderLine;
};
