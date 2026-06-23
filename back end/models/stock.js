module.exports = (sequelize, DataTypes) => {
    const Stock = sequelize.define('Stock', {
        item_id: {
            primaryKey: true,
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
            defaultValue: 0
        },
        low_stock_threshold: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 5
        }
    }, {
        tableName: 'stock',
        timestamps: false
    });

    return Stock;
};