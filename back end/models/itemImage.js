module.exports = (sequelize, DataTypes) => {
    const ItemImage = sequelize.define('ItemImage', {
        image_id: {
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
        image_path: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        is_primary: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        sort_order: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        }
    }, {
        tableName: 'item_images',
        timestamps: true,
        updatedAt: false
    });

    return ItemImage;
};
