const db = require('./back end/models');
(async () => {
  try {
    const { Item, ItemImage } = db;
    const items = await Item.findAll({
      raw: false,
      where: { is_visible: true, is_available: true },
      include: [{ model: ItemImage, attributes: ['image_id', 'image_path', 'is_primary', 'sort_order'] }],
      order: [[ItemImage, 'sort_order', 'ASC'], ['created_at', 'DESC']],
      limit: 20
    });
    console.log('found', items.length);
    for (const item of items) {
      console.log('item', item.item_id, item.camera_brand, item.camera_model, 'imgs=', item.ItemImages ? item.ItemImages.length : 0);
      if (item.ItemImages && item.ItemImages.length) {
        console.log(JSON.stringify(item.ItemImages.map(i => ({ id: i.image_id, path: i.image_path, primary: i.is_primary, sort: i.sort_order })), null, 2));
      }
    }
  } catch (err) {
    console.error('ERR', err);
  } finally {
    process.exit(0);
  }
})();
