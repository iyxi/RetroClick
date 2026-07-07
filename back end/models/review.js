module.exports = (sequelize, DataTypes) => {
    const Review = sequelize.define('Review', {
        review_id: {
            type: DataTypes.BIGINT.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        item_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false
        },
        customer_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false
        },
        rating: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: { min: 1, max: 5 }
        },
        comment: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        is_visible: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    }, {
        tableName: 'reviews',
        timestamps: true,
        underscored: true
    });

    return Review;
};
