const bcrypt = require('bcrypt');
const db = require('./models');
const User = db.User;
const Customer = db.Customer;
const Item = db.Item;
const ItemImage = db.ItemImage;
const Order = db.Order;
const OrderLine = db.OrderLine;



const seedData = async () => {
  try {
    await db.sequelize.authenticate();
    console.log('Database connection OK');

    const users = [
      {
        name: 'Admin',
        email: 'admin@retroclick.com',
        password: 'Admin@123',
        role: 'admin',
        is_active: true
      },
      {
        name: 'Yel',
        email: 'riel@gmail.com',
        password: 'rielganda',
        role: 'customer',
        is_active: true
      },
      {
        name: 'Iya',
        email: 'iyxi@gmail.com',
        password: 'iyannaangela21',
        role: 'customer',
        is_active: true
      }
    ];

    const createdUsers = {};
    for (const userData of users) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const [user] = await User.findOrCreate({
        where: { email: userData.email },
        defaults: {
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
          role: userData.role,
          is_active: userData.is_active
        }
      });
      if (user.password !== hashedPassword) {
        await user.update({ password: hashedPassword });
      }
      createdUsers[userData.email] = user;
      console.log(`User created or exists: ${userData.email}`);
    }

    const customers = [
      {
        userEmail: 'riel@gmail.com',
        fname: 'Yel',
        lname: null,
        addressline: null,
        zipcode: null,
        phone: null,
        image_path: null
      },
      {
        userEmail: 'iyxi@gmail.com',
        fname: 'Iya',
        lname: null,
        addressline: null,
        zipcode: null,
        phone: null,
        image_path: null
      }
    ];

    for (const customerData of customers) {
      const user = createdUsers[customerData.userEmail];
      if (!user) {
        console.warn(`Skipping customer because user not found: ${customerData.userEmail}`);
        continue;
      }

      await Customer.findOrCreate({
        where: { user_id: user.id },
        defaults: {
          fname: customerData.fname,
          lname: customerData.lname,
          addressline: customerData.addressline,
          zipcode: customerData.zipcode,
          phone: customerData.phone,
          image_path: customerData.image_path,
          user_id: user.id
        }
      });
      console.log(`Customer record created or exists for: ${customerData.userEmail}`);
    }

    const items = [
      {
        camera_brand: 'Casio',
        camera_model: 'Z-R1',
        description: 'With printable films',
        sell_price: 765.00,
        cost_price: -1235.00,
        condition: 'Good',
        quantity: 20,
        img_path: 'images/items/casio-z-r1-main.png',
        is_visible: true,
        is_available: true
      },
      {
        camera_brand: 'Canon',
        camera_model: 'AE-1',
        description: 'Able of handling a semi-professional shoot',
        sell_price: 8000.00,
        cost_price: 6000.00,
        condition: 'Like New',
        quantity: 10,
        img_path: 'images/items/canon-ae-1-main.jpg',
        is_visible: true,
        is_available: true
      },
      {
        camera_brand: 'Minolta',
        camera_model: 'SRT 101',
        description: 'Manual focus SLR with 50mm lens',
        sell_price: 7460.00,
        cost_price: 5460.00,
        condition: 'Good',
        quantity: 67,
        img_path: 'images/items/minolta-srt101-main.jpg',
        is_visible: true,
        is_available: true
      },
      {
        camera_brand: 'Pentax',
        camera_model: 'K1000',
        description: 'Classic SLR camera body',
        sell_price: 6800.00,
        cost_price: 4800.00,
        condition: 'Good',
        quantity: 6,
        img_path: 'images/items/pentax-k1000-main.jpg',
        is_visible: true,
        is_available: true
      },
      {
        camera_brand: 'Leica',
        camera_model: 'M6',
        description: 'Professional rangefinder camera body',
        sell_price: 18500.00,
        cost_price: 12500.00,
        condition: 'Like New',
        quantity: 4,
        img_path: 'images/items/leica-m6-main.jpg',
        is_visible: true,
        is_available: true
      },
      {
        camera_brand: 'Nikon',
        camera_model: 'FM2',
        description: 'SLR film camera body only',
        sell_price: 4999.00,
        cost_price: 2999.00,
        condition: 'Like New',
        quantity: 5,
        img_path: 'images/items/nikon-fm2-main.jpg',
        is_visible: true,
        is_available: true
      },
      {
        camera_brand: 'Canon',
        camera_model: 'A-1',
        description: 'Compact 35mm point-and-shoot camera',
        sell_price: 3999.00,
        cost_price: 1999.00,
        condition: 'Good',
        quantity: 8,
        img_path: 'images/items/canon-a1-main.jpg',
        is_visible: true,
        is_available: true
      }
    ];

    const item_images = [
  {
    camera_brand: 'Casio',
    camera_model: 'Z-R1',
    image_path: 'images/items/olympus-35sp-main.JPG',
    is_primary: false,
    sort_order: 2
  },
  {
    camera_brand: 'Canon',
    camera_model: 'AE-1',
    image_path: 'images/items/canon-a1-main.jpg',
    is_primary: false,
    sort_order: 2
  },
  {
    camera_brand: 'Pentax',
    camera_model: 'K1000',
    image_path: 'images/items/canon-ae1-main.jpg',
    is_primary: false,
    sort_order: 2
  },
  {
    camera_brand: 'Minolta',
    camera_model: 'SRT 101',
    image_path: 'images/items/pentax-k1000-main.jpg',
    is_primary: false,
    sort_order: 2
  },
  {
    camera_brand: 'Pentax',
    camera_model: 'K1000',
    image_path: 'images/items/minolta-srt101-main.jpg',
    is_primary: false,
    sort_order: 2
  },
  {
    camera_brand: 'Leica',
    camera_model: 'M6',
    image_path: 'images/items/pentax-k1000-main.jpg',
    is_primary: false,
    sort_order: 2
  },
  {
    camera_brand: 'Nikon',
    camera_model: 'FM2',
    image_path: 'images/items/leica-m6-main.jpg',
    is_primary: false,
    sort_order: 2
  },
  {
    camera_brand: 'Canon',
    camera_model: 'A-1',
    image_path: 'images/items/nikon-fm2-main.jpg',
    is_primary: false,
    sort_order: 2
  }
];

    for (const itemData of items) {
      const [item] = await Item.findOrCreate({
        where: {
          camera_brand: itemData.camera_brand,
          camera_model: itemData.camera_model
        },
        defaults: itemData
      });

      console.log(`Item created or exists: ${itemData.camera_brand} ${itemData.camera_model}`);

      const imagesForItem = item_images.filter(
        (image) => image.camera_brand === itemData.camera_brand && image.camera_model === itemData.camera_model
      );

      for (const image of imagesForItem) {
        await ItemImage.findOrCreate({
          where: {
            item_id: item.item_id,
            image_path: image.image_path
          },
          defaults: {
            item_id: item.item_id,
            image_path: image.image_path,
            is_primary: image.is_primary,
            sort_order: image.sort_order
          }
        });
      }
    }

    const sampleOrders = [
      {
        userEmail: 'iyxi@gmail.com',
        date_placed: new Date('2026-07-06T21:29:00'),
        shipping: 150.00,
        status: 'Completed',
        payment_method: 'COD',
        orderLines: [
          { camera_brand: 'Casio', camera_model: 'Z-R1', quantity: 1, unit_price: 765.00 },
          { camera_brand: 'Fair', camera_model: '1969', quantity: 1, unit_price: 6999.00 }
        ]
      },
      {
        userEmail: 'riel@gmail.com',
        date_placed: new Date('2026-07-07T00:16:00'),
        shipping: 150.00,
        status: 'Cancelled',
        payment_method: 'GCash',
        orderLines: [
          { camera_brand: 'Minolta', camera_model: 'SRT 101', quantity: 1, unit_price: 7460.00 }
        ]
      },
      {
        userEmail: 'iyxi@gmail.com',
        date_placed: new Date('2026-08-15T14:10:00'),
        shipping: 200.00,
        status: 'Completed',
        payment_method: 'Card',
        orderLines: [
          { camera_brand: 'Canon', camera_model: 'AE-1', quantity: 2, unit_price: 8000.00 }
        ]
      },
      {
        userEmail: 'riel@gmail.com',
        date_placed: new Date('2026-09-03T11:25:00'),
        shipping: 120.00,
        status: 'Processing',
        payment_method: 'COD',
        orderLines: [
          { camera_brand: 'Nikon', camera_model: 'FM2', quantity: 1, unit_price: 4999.00 },
          { camera_brand: 'Canon', camera_model: 'A-1', quantity: 2, unit_price: 3999.00 }
        ]
      }
    ];

    for (const orderData of sampleOrders) {
      const user = createdUsers[orderData.userEmail];
      if (!user) {
        console.warn(`Skipping order because user not found: ${orderData.userEmail}`);
        continue;
      }

      const customer = await Customer.findOne({ where: { user_id: user.id } });
      if (!customer) {
        console.warn(`Skipping order because customer record not found for: ${orderData.userEmail}`);
        continue;
      }

      const [order] = await Order.findOrCreate({
        where: { notes: orderData.notes },
        defaults: {
          customer_id: customer.customer_id,
          date_placed: orderData.date_placed,
          shipping: orderData.shipping,
          status: orderData.status,
          payment_method: orderData.payment_method,
          notes: orderData.notes
        }
      });

      for (const line of orderData.orderLines) {
        const item = await Item.findOne({
          where: { camera_brand: line.camera_brand, camera_model: line.camera_model }
        });
        if (!item) {
          console.warn(`Skipping orderline because item not found: ${line.camera_brand} ${line.camera_model}`);
          continue;
        }

        await OrderLine.findOrCreate({
          where: {
            orderinfo_id: order.orderinfo_id,
            item_id: item.item_id,
            quantity: line.quantity,
            unit_price: line.unit_price
          },
          defaults: {
            orderinfo_id: order.orderinfo_id,
            item_id: item.item_id,
            quantity: line.quantity,
            unit_price: line.unit_price
          }
        });
        console.log(`Order line created or exists for order ${orderData.notes}: ${line.camera_brand} ${line.camera_model}`);
      }

      console.log(`Order created or exists: ${orderData.notes}`);
    }

    console.log('Seed completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

seedData();
