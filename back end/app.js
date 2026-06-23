const users = require('./routes/user');
const orders = require('./routes/order');
const dashboard = require('./routes/dashboard')
const admin = require('./routes/admin');
const inventory = require('./routes/inventory');
const search = require('./routes/search');
const payment = require('./routes/payment');

app.use('/api/v1', users);
app.use('/api/v1', orders);
app.use('/api/v1', dashboard);
app.use('/api/v1/admin', admin);
app.use('/api/v1/inventory', inventory);
app.use('/api/v1/search', search);
app.use('/api/v1/payments', payment);

module.exports = app
module.exports = app
