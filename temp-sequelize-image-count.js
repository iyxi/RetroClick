const db = require('./back end/models');
(async () => {
  try {
    const [results] = await db.sequelize.query(`
      SELECT i.item_id, i.camera_brand, i.camera_model, i.img_path, i.is_visible, i.is_available,
        COUNT(ii.image_id) AS image_count,
        GROUP_CONCAT(ii.image_path ORDER BY ii.sort_order SEPARATOR ';') AS image_paths
      FROM item i
      LEFT JOIN item_images ii ON i.item_id = ii.item_id
      GROUP BY i.item_id
      ORDER BY i.item_id
    `);
    console.log(JSON.stringify(results, null, 2));
  } catch (err) {
    console.error('ERR', err);
  } finally {
    process.exit(0);
  }
})();
