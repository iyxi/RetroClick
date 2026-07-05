const express = require('express');
const cors = require('cors');
const path = require('path');

const items = require('./routes/item');
const users = require('./routes/user');
const orders = require('./routes/order');
const dashboard = require('./routes/dashboard');
// const media = require('./routes/media');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/images', express.static(path.join(__dirname, '..', 'images')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(express.static(path.join(__dirname, '../ui')));

app.use('/api/v1', items);
app.use('/api/v1', users);
app.use('/api/v1', orders);
app.use('/api/v1', dashboard);
// app.use('/api/v1', media);

// Multer error logging middleware (diagnostic)
app.use((err, req, res, next) => {
	if (err && err.name === 'MulterError') {
		console.error('MULTER ERROR:', {
			message: err.message,
			code: err.code,
			field: err.field || null,
			route: req.originalUrl,
			method: req.method,
			contentType: req.headers['content-type']
		});
		return res.status(400).json({ error: 'File upload error', details: err.message, field: err.field || null });
	}
	return next(err);
});

module.exports = app;
