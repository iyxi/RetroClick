module.exports = (sequelize, DataTypes) => {
    const OrderStatusHistory = sequelize.define('OrderStatusHistory', {
        history_id: {
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
        old_status: {
            type: DataTypes.ENUM('Pending', 'Processing', 'Shipped', 'Completed', 'Cancelled'),
            allowNull: true
        },
        new_status: {
            type: DataTypes.ENUM('Pending', 'Processing', 'Shipped', 'Completed', 'Cancelled'),
            allowNull: false
        },
        changed_by: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        changed_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        remarks: {
            type: DataTypes.STRING(255),
            allowNull: true
        }
    }, {
        tableName: 'order_status_history',
        timestamps: false
    });

    return OrderStatusHistory;
};
