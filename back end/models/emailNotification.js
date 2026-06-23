module.exports = (sequelize, DataTypes) => {
    const EmailNotification = sequelize.define('EmailNotification', {
        notification_id: {
            type: DataTypes.BIGINT.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        orderinfo_id: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: true,
            references: {
                model: 'orderinfo',
                key: 'orderinfo_id'
            }
        },
        user_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        recipient_email: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        subject: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        body: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('Queued', 'Sent', 'Failed'),
            allowNull: false,
            defaultValue: 'Queued'
        },
        sent_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        error_message: {
            type: DataTypes.STRING(255),
            allowNull: true
        }
    }, {
        tableName: 'email_notifications',
        timestamps: true,
        updatedAt: false
    });

    return EmailNotification;
};
