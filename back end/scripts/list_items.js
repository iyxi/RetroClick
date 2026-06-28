const db = require('../models');

(async () => {
  try {
    await db.sequelize.authenticate();
    const Item = db.Item;
    const items = await Item.findAll({ raw: true, order: [['created_at', 'DESC']] });
    for (const it of items) {
      console.log(it);
    }
    process.exit(0);
  } catch (err) {
    console.error('Error listing items:', err);
    process.exit(1);
  }
})();
