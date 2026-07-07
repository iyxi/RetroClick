const connection = require('../config/database');
const { QueryTypes } = require('sequelize');

const SALES_BASE_SQL = `
    FROM orderinfo oi
    INNER JOIN orderline ol ON oi.orderinfo_id = ol.orderinfo_id
    INNER JOIN item i ON i.item_id = ol.item_id
    WHERE LOWER(COALESCE(oi.status, '')) <> 'cancelled'
`;

exports.addressChart = async (req, res) => {
    const sql = 'SELECT count(addressline) as total, addressline FROM customer GROUP BY addressline ORDER BY total DESC';
    try {
        const rows = await connection.query(sql, { type: QueryTypes.SELECT });
        return res.status(200).json({ rows });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error fetching address chart', details: error.message });
    }


};

exports.salesChart = async (req, res) => {
    const sql = `
        SELECT DATE_FORMAT(oi.date_placed, '%b %Y') AS month, SUM(ol.quantity) AS total
        ${SALES_BASE_SQL}
        GROUP BY DATE_FORMAT(oi.date_placed, '%Y-%m'), DATE_FORMAT(oi.date_placed, '%b %Y')
        ORDER BY MIN(oi.date_placed)
    `;
    try {
        const rows = await connection.query(sql, { type: QueryTypes.SELECT });
        return res.status(200).json({ rows });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error fetching sales chart', details: error.message });
    }


};

exports.itemsChart = async (req, res) => {
    const sql = 'SELECT i.description as items, sum(ol.quantity) as total FROM item i INNER JOIN orderline ol ON i.item_id = ol.item_id GROUP BY i.description';
    try {
        const rows = await connection.query(sql, { type: QueryTypes.SELECT });
        return res.status(200).json({ rows });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error fetching items chart', details: error.message });
    }


};

exports.salesOverview = async (req, res) => {
    try {
        const [salesRows, monthlyRows, brandRows, topModelRows] = await Promise.all([
            connection.query(
                `
                    SELECT
                        oi.orderinfo_id,
                        oi.date_placed,
                        oi.status,
                        oi.payment_method,
                        ROUND(SUM(ol.quantity * ol.unit_price) OVER (PARTITION BY oi.orderinfo_id), 2) AS order_total,
                        ol.orderline_id,
                        ol.item_id,
                        i.camera_brand,
                        i.camera_model,
                        ol.quantity,
                        ol.unit_price,
                        ROUND(ol.quantity * ol.unit_price, 2) AS line_total
                    ${SALES_BASE_SQL}
                    ORDER BY oi.date_placed DESC, oi.orderinfo_id DESC, ol.orderline_id DESC
                    LIMIT 200
                `,
                { type: QueryTypes.SELECT }
            ),
            connection.query(
                `
                    SELECT
                        DATE_FORMAT(oi.date_placed, '%Y-%m') AS month_key,
                        DATE_FORMAT(oi.date_placed, '%b %Y') AS month_label,
                        SUM(ol.quantity) AS sold_total
                    ${SALES_BASE_SQL}
                    GROUP BY DATE_FORMAT(oi.date_placed, '%Y-%m'), DATE_FORMAT(oi.date_placed, '%b %Y')
                    ORDER BY month_key
                `,
                { type: QueryTypes.SELECT }
            ),
            connection.query(
                `
                    SELECT
                        i.camera_brand,
                        SUM(ol.quantity) AS sold_total
                    ${SALES_BASE_SQL}
                    GROUP BY i.camera_brand
                    ORDER BY sold_total DESC, i.camera_brand ASC
                `,
                { type: QueryTypes.SELECT }
            ),
            connection.query(
                `
                    SELECT
                        i.camera_model,
                        SUM(ol.quantity) AS sold_total
                    ${SALES_BASE_SQL}
                    GROUP BY i.camera_model
                    ORDER BY sold_total DESC, i.camera_model ASC
                    LIMIT 5
                `,
                { type: QueryTypes.SELECT }
            )
        ]);

        const topModels = topModelRows.map(row => row.camera_model);
        let modelTrendRows = [];

        if (topModels.length) {
            modelTrendRows = await connection.query(
                `
                    SELECT
                        DATE_FORMAT(oi.date_placed, '%Y-%m') AS month_key,
                        DATE_FORMAT(oi.date_placed, '%b %Y') AS month_label,
                        i.camera_model,
                        SUM(ol.quantity) AS sold_total
                    ${SALES_BASE_SQL}
                    AND i.camera_model IN (:models)
                    GROUP BY DATE_FORMAT(oi.date_placed, '%Y-%m'), DATE_FORMAT(oi.date_placed, '%b %Y'), i.camera_model
                    ORDER BY month_key
                `,
                {
                    replacements: { models: topModels },
                    type: QueryTypes.SELECT
                }
            );
        }

        return res.status(200).json({
            success: true,
            rows: salesRows,
            monthlyRows,
            brandRows,
            topModelRows,
            modelTrendRows,
            topModels
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Error fetching sales overview', details: error.message });
    }
};