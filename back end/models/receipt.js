module.exports = (sequelize, DataTypes) => {
    const Receipt = sequelize.define('Receipt', {
        receipt_id: {
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
        payment_id: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: true,
            references: {
                model: 'payments',
                key: 'payment_id'
            }
        },
        receipt_no: {
            type: DataTypes.STRING(80),
            allowNull: false,
            unique: true
        },
        receipt_pdf_path: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        issued_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    }, {
        tableName: 'receipts',
        timestamps: false
    });

    return Receipt;
};
