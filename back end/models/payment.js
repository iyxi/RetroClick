module.exports = (sequelize, DataTypes) => {
    const Payment = sequelize.define('Payment', {
        payment_id: {
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
        customer_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: {
                model: 'customer',
                key: 'customer_id'
            }
        },
        payment_method: {
            type: DataTypes.ENUM('GCash', 'Card', 'COD'),
            allowNull: false
        },
        amount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false
        },
        payment_status: {
            type: DataTypes.ENUM('Pending', 'Paid', 'Failed', 'Refunded'),
            allowNull: false,
            defaultValue: 'Pending'
        },
        transaction_reference: {
            type: DataTypes.STRING(120),
            allowNull: true
        },
        paid_at: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        tableName: 'payments',
        timestamps: true,
        underscored: true
    });

    return Payment;
};
