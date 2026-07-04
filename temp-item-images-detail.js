const db = require('./back end/models');
(async () => {
  try {
    const [results] = await db.sequelize.query(`
      SELECT image_id, item_id, image_path, is_primary, sort_order
      FROM item_images
      WHERE item_id IN (8, 10)
      ORDER BY item_id, sort_order, image_id;
    `);
    console.log(JSON.stringify(results, null, 2));
  } catch (err) {
    console.error('ERR', err);
  } finally {
    process.exit(0);
  }
})();
