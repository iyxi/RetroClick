const express = require('express');
const app = express();
const cors = require('cors')
const path = require('path');


const items = require('./routes/item');
const users = require('./routes/user');
const orders = require('./routes/order');
const dashboard = require('./routes/dashboard')
const admin = require('./routes/admin');
const inventory = require('./routes/inventory');
const search = require('./routes/search');
const payment = require('./routes/payment');

// app.get('/', (req, res) => {
//     res.send('Hello from nodejs!')
// })
app.use(cors())
app.use(express.json())
app.use('/images', express.static(path.join(__dirname, 'images')))
// app.use(express.urlencoded({ extended: true }));

app.use('/api/v1', items);
app.use('/api/v1', users);
app.use('/api/v1', orders);
app.use('/api/v1', dashboard);
app.use('/api/v1/admin', admin);
app.use('/api/v1/inventory', inventory);
app.use('/api/v1/search', search);
app.use('/api/v1/payments', payment);

module.exports = app