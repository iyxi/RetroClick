module.exports = (sequelize, DataTypes) => {
    const StockRestock = sequelize.define('StockRestock', {
        restock_id: {
            type: DataTypes.BIGINT.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        item_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: {
                model: 'item',
                key: 'item_id'
            }
        },
        quantity_added: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        restock_date: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        notes: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        restocked_by: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            }
        }
    }, {
        tableName: 'stock_restock',
        timestamps: false
    });

    return StockRestock;
};
