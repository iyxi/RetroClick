module.exports = (sequelize, DataTypes) => {
    const ReviewImage = sequelize.define('ReviewImage', {
        image_id: {
            type: DataTypes.BIGINT.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        review_id: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false
        },
        image_path: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        sort_order: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        }
    }, {
        tableName: 'review_images',
        timestamps: false
    });

    return ReviewImage;
};
