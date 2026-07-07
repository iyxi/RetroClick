# RetroClick — Reviewer Report

This document summarizes the system components mapped to the milestone (MP) list, includes exact code snippets, and explains purpose and usage.

## Overview mapping to MPs
- MP1 / MP2: NodeJS CRUD APIs — implemented by controllers in `back end/controllers/` and routes in `back end/routes/`.
- MP3 / MP4: jQuery/Datatables CRUD and multiple file uploads — admin UI in `ui/js/admin.js` + `back end/utils/multer.js` + `routes/item.js` using `upload.array('images', 5)`.
- MP5: Token generation & storage — `back end/controllers/user.js` creates JWT and saves to `auth_token` on `User`.
- MP6: Registration & Login via jQuery AJAX — frontend `ui/js/user.js` and server `back end/controllers/user.js` & `back end/routes/user.js`.
- MP7: Sequelize ORM — all DB interactions use `db.Model` calls defined in `back end/models`.
- Transactions, emails, PDF receipts: `back end/controllers/order.js` builds PDF and calls `sendEmail`.
- Route protection / role middleware: `back end/middlewares/auth.js` (see exact code below).

---

## 1) Authentication flow — exact lines

### Login controller: token creation and saving (excerpt)
File: `back end/controllers/user.js`

```js
// Generate JWT token including role for faster authorization checks
const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

// Save token and update last login
try {
    await user.update({ auth_token: token, last_login_at: new Date() });
} catch (err) {
    console.error('Failed to save auth token:', err.message);
}

const userResponse = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
};

return res.status(200).json({
    success: true,
    message: 'Welcome back',
    user: userResponse,
    token
});
```

Purpose & behavior:
- JWT created with `id` and `role` to avoid extra DB lookups for role checks.
- Token expires in 1 hour.
- Token also persisted to `User.auth_token` field as a saved reference.
- Frontend receives `token` in JSON response and stores it in session storage.

---

### Frontend storing token (excerpt)
File: `ui/js/user.js`

```js
persistAuthState('token', data.token)
persistAuthState('userId', data.user.id)
persistAuthState('userRole', data.user.role)
persistAuthState('userName', data.user.name)
persistAuthState('userEmail', data.user.email)

const persistAuthState = (key, value) => {
    clearStaleLocalAuth();
    sessionStorage.setItem(key, JSON.stringify(value));
};
```

Purpose:
- `sessionStorage` keeps auth data for the browser session.
- `token` is later added to `Authorization: Bearer <token>` header by frontend code when calling protected APIs.

---

## 2) Route protection middleware (exact code)
File: `back end/middlewares/auth.js`

```js
const jwt = require("jsonwebtoken");

exports.isAuthenticatedUser = (req, res, next) => {
    const auth = req.header('Authorization') || req.header('authorization');
    if (!auth) return res.status(401).json({ message: 'Login first to access this resource' });

    const parts = auth.split(' ');
    const token = parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : parts[0];

    if (!token) return res.status(401).json({ message: 'Login first to access this resource' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: decoded.id };
        if (decoded.role) req.user.role = decoded.role;
        req.body = req.body || {};
        req.body.user = { id: decoded.id };
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

exports.requireRole = (roles) => {
    const allowed = Array.isArray(roles) ? roles : [roles];
    return async (req, res, next) => {
        try {
            const tokenRole = req.user?.role;
            if (tokenRole) {
                if (!allowed.includes(tokenRole)) return res.status(403).json({ message: 'Access denied. Insufficient privileges.' });
                return next();
            }

            const db = require('../models');
            const userId = req.user?.id || req.body?.user?.id;
            if (!userId) return res.status(401).json({ message: 'Login first to access this resource' });

            const User = db.User;
            const user = await User.findOne({ where: { id: userId } });
            if (!user) return res.status(404).json({ message: 'User not found' });

            if (!allowed.includes(user.role)) {
                return res.status(403).json({ message: 'Access denied. Insufficient privileges.' });
            }

            req.user = req.user || {};
            req.user.role = user.role;
            next();
        } catch (error) {
            console.error('requireRole middleware error:', error);
            return res.status(500).json({ message: 'Authorization error', details: error.message });
        }
    };
};

// Convenience
exports.isAdmin = exports.requireRole('admin');
exports.isManager = exports.requireRole(['manager', 'admin']);
```

Purpose:
- `isAuthenticatedUser` is a gate for routes requiring login.
- `requireRole` (and `isAdmin`/`isManager`) enforce role-based access.
- They attach `req.user` so controllers know the acting user.

---

## 3) Route wiring examples (exact lines)
File: `back end/routes/user.js`

```js
router.post('/register', registerUser)
router.post('/login', loginUser)
router.get('/profile', isAuthenticatedUser, (req, res) => { ... })
router.post('/update-profile', isAuthenticatedUser, upload.single('image'), updateUser)

// Admin routes
router.get('/users', isAuthenticatedUser, isManager, getAllUsers)
router.put('/users/:id/role', isAuthenticatedUser, isManager, updateUserRole)
```

Purpose:
- Routes call middleware before controllers. Example: only manager/admin may list users.

---

## 4) Cart persistence server-side (exact excerpts)
File: `back end/controllers/cart.js`

```js
exports.getCart = async (req, res) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const customer = await getCustomerForUser(userId);
    const cart = await getOrCreateActiveCart(customer.customer_id);
    const items = await buildCartResponse(cart);
    return res.status(200).json({ success: true, cart: items });
};

exports.updateCart = async (req, res) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const customer = await getCustomerForUser(userId);
    const cart = await getOrCreateActiveCart(customer.customer_id);

    await CartItem.destroy({ where: { cart_id: cart.cart_id } });

    const createPromises = items
        .filter(item => item && Number(item.item_id) > 0 && Number(item.quantity) > 0)
        .map(item => CartItem.create({
            cart_id: cart.cart_id,
            item_id: Number(item.item_id),
            quantity: Number(item.quantity)
        }));

    await Promise.all(createPromises);
    const updatedItems = await buildCartResponse(cart);
    return res.status(200).json({ success: true, cart: updatedItems });
};
```

Why this matters:
- The frontend must call `/api/v1/cart` with `Authorization` header to persist cart.
- The `index.html` earlier was using `localStorage` — fixed to call `fetchCart()`/`saveCart()` to use this API.

---

## 5) Reviews API (excerpt)
File: `back end/controllers/review.js`

```js
exports.createReview = async (req, res) => {
    const userId = req.user?.id || req.body?.user?.id;
    if (!userId) return res.status(401).json({ message: 'Login required' });

    const { item_id, rating, comment } = req.body;
    // Verify customer and purchase
    const customer = await Customer.findOne({ where: { user_id: userId } });
    const purchased = await OrderLine.findOne({ where: { item_id }, include: [{ model: Order, where: { customer_id: customer.customer_id, status: 'Completed' } }] });

    if (!purchased) return res.status(403).json({ message: 'You can only review items you have purchased and completed' });

    const review = await Review.create({ item_id, customer_id: customer.customer_id, rating: parsedRating, comment });
    // Save uploaded review images
    const files = req.files || [];
    const filePaths = files.map(f => String(f.path).replace(/\\/g, '/'));
    for (let i = 0; i < filePaths.length; i++) {
        await ReviewImage.create({ review_id: review.review_id, image_path: filePaths[i], sort_order: i });
    }

    return res.status(201).json({ success: true, review });
};
```

Notes:
- Reviews require purchase and prevent duplicates.
- Images saved with `multer` and inserted into `ReviewImage`.

---

## 6) File uploads (items & reviews)
File: `back end/routes/item.js` (excerpt)

```js
router.post('/items', isAuthenticatedUser, isManager, upload.array('images', 5), createItem)
router.post('/items/:id', isAuthenticatedUser, isManager, upload.array('images', 5), updateItem)
```

`upload` comes from `back end/utils/multer.js` which configures storage and destination.

---

## 7) Admin UI: DataTables and Charts (examples)
File: `ui/js/admin.js` (chart creation excerpt)

```js
salesMonthChart = new Chart(document.getElementById('salesMonthChart'), {
    type: 'bar',
    data: { labels: monthLabels, datasets: [{ label: 'Units sold', data: monthValues, ... }] },
    options: { responsive: true, maintainAspectRatio: false }
});

salesBrandChart = new Chart(document.getElementById('salesBrandChart'), { type: 'doughnut', ... });

salesTrendChart = new Chart(document.getElementById('salesTrendChart'), { type: 'line', ... });
```

Why:
- Visualize sales and product performance for admin.

---

## 8) Transaction emails and PDF receipts (exact excerpts)
File: `back end/controllers/order.js` (excerpt)

```js
const receiptPdf = buildReceiptPdf({ orderId: order.orderinfo_id, customerName: fullName, address: deliveryAddress, items: orderItems, shippingFee: totals.shipping, total: totals.total, paymentMethod, placedAt: order.date_placed || new Date() });

if (userRecord && userRecord.email) {
    const html = buildReceiptEmailHtml({ ... });
    await sendOrderEmail({
        orderId: order.orderinfo_id,
        recipientEmail: userRecord.email,
        recipientName: fullName,
        subject: `Order ${order.status} - RetroClick`,
        html,
        attachments: [{ filename: `receipt-${order.orderinfo_id}.pdf`, content: receiptPdf, contentType: 'application/pdf' }]
    });
}
```

`sendOrderEmail` uses `back end/utils/sendEmail.js` to send via configured SMTP.

---

## 9) Frontend autocomplete (homepage)
File: `ui/js/home.js` (excerpt)

```js
const attachShopSearchAutocomplete = () => {
  const searchInput = $('#shopSearchInput');
  searchInput.on('input', function () {
    const raw = this.value || '';
    renderSuggestions(raw);
    // Inline type-ahead: autofill top suggestion and select appended text
    if (!_isDeletion && !_skipAutofill) {
      const suggestions = buildSearchSuggestions(raw);
      if (suggestions.length && raw.length > 0) {
        const top = suggestions[0].label || '';
        if (top.toLowerCase().startsWith(raw.toLowerCase()) && top.length > raw.length) {
          this.value = top;
          try { this.setSelectionRange(raw.length, top.length); } catch (e) {}
        }
      }
    }
  });
};
```

Purpose:
- Provide search suggestions and inline type-ahead on the homepage.

---

## 10) How middleware and role checks flow into MPs
- Every protected CRUD API for MP1/MP2/MP3/MP4 is routed behind `isAuthenticatedUser` and `isManager` / `isAdmin` where appropriate in the `routes/*` files.
- This implements Quiz 6 (route protection) exactly.

---

## Next steps & how I can help further
- I can extract more exact line ranges for any specific file you want (e.g., full `item.js` controller). Tell me which file and I'll paste its full implementation with line numbers.
- I can run a quick end-to-end test sequence locally (start server, run a login request, exercise cart endpoints) if you want, but I need permission to run `npm start` in `back end`.

---

End of report. If you want a condensed PDF or separate files per MP, say which format you prefer.

-- Reviewer checklist --

- MP1: CRUD APIs verified in `back end/controllers/item.js` and `back end/routes/item.js` (see file for full CRUD functions `createItem`, `getAllItems`, `getSingleItem`, `updateItem`, `deleteItem`).
- MP2: CRUD APIs verified in `back end/controllers/order.js` and `back end/routes/order.js` (order creation, update, retrieval, deletion implemented).
- MP3: Item create/update uses `upload.array('images', 5)` and `back end/utils/multer.js` to accept multiple files; frontend `ui/js/admin.js` submits multipart forms.
- MP4: Admin product listing uses DataTables logic in `ui/js/admin.js` and communicates with item routes for CRUD operations.
- MP5: Token generation done in `back end/controllers/user.js` with `jwt.sign(...)` and stored to `User.auth_token`; token is returned to frontend and saved to `sessionStorage`.
- MP6: Registration/login flows implemented in `ui/js/user.js` + `back end/controllers/user.js`; admin user management controllers in `back end/controllers/userManagement.js` and protected by `isManager`.
- MP7: Sequelize ORM used across `back end/controllers/*` with `db = require('../models')` and model calls like `findAll`, `create`, `update`, `destroy`.
- Term test / Transactions: `back end/controllers/order.js` implements transactions CRUD, order line creation, and uses `Cart`/`CartItem` cleanup logic.
- Emails & PDF: `buildReceiptPdf()` and `sendOrderEmail()` in `back end/controllers/order.js` provide email+attachment behavior.
- Quiz 4: jQuery validations present in `ui/js/user.js` and `ui/js/admin.js` for forms.
- Quiz 5: Autocomplete implemented in `ui/js/home.js` (`attachShopSearchAutocomplete`).
- Quiz 6: `back end/middlewares/auth.js` provides `isAuthenticatedUser`, `requireRole`, `isAdmin`, and `isManager` used by routes.
- Quiz 7: Charts implemented in `ui/js/admin.js` using Chart.js (`salesMonthChart`, `salesBrandChart`, `salesTrendChart`).
- Unit tests: There are no explicit unit test files in the workspace; recommend adding a `tests/` folder and using `jest` or `mocha`.
- Infinite scroll: `ui/js/home.js` implements pagination and an `infinite` display mode flag; adapt to fully infinite scroll by wiring scroll event to `loadedPage` increment.

