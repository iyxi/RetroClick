module.exports = (sequelize, DataTypes) => {
    const Item = sequelize.define('Item', {
        item_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        cost_price: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0.00
        },
        sell_price: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false
        },
        img_path: {
            type: DataTypes.STRING,
            allowNull: true
        },
        camera_brand: {
            type: DataTypes.STRING(120),
            allowNull: false
        },
        camera_model: {
            type: DataTypes.STRING(150),
            allowNull: false
        },
        condition: {
            type: DataTypes.ENUM('Brand New', 'Like New', 'Good', 'Fair', 'Used'),
            allowNull: false,
            defaultValue: 'Good'
        },
        year_released: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        is_visible: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        is_available: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    }, {
        tableName: 'item',
        timestamps: true,
        underscored: true
    });
    return Item;
};