module.exports = (sequelize, DataTypes) => {
    const Media = sequelize.define('Media', {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        filename: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        file_path: {
            type: DataTypes.STRING(512),
            allowNull: false
        },
        file_type: {
            type: DataTypes.ENUM('mp3','mp4'),
            allowNull: false
        },
        uploaded_by: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true
        },
        is_visible: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    }, {
        tableName: 'media',
        timestamps: true,
        underscored: true
    });

    return Media;
};
