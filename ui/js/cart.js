$(document).ready(function () {
    const url = 'http://localhost:3000/';
    let cartCache = [];
    let cartLoaded = false;

    const getStoredToken = () => {
        const rawToken = sessionStorage.getItem('token');
        if (!rawToken) return null;

        try {
            return JSON.parse(rawToken);
        } catch (error) {
            return rawToken;
        }
    };

    const getStoredUserRole = () => {
        const rawRole = sessionStorage.getItem('userRole');
        if (!rawRole) return '';

        try {
            return JSON.parse(rawRole);
        } catch (error) {
            return rawRole;
        }
    };

    const authHeaders = () => {
        const token = getStoredToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const isCustomerUser = () => {
        const role = String(getStoredUserRole() || '').toLowerCase();
        return !role || role === 'customer';
    };

    const requireCustomer = () => {
        if (!getStoredToken()) {
            Swal.fire({
                icon: 'warning',
                text: 'You must be logged in to access your cart.',
                showConfirmButton: true
            }).then(() => window.location.href = 'login.html');
            return false;
        }

        if (!isCustomerUser()) {
            Swal.fire({
                icon: 'warning',
                text: 'Admin access is not allowed on the customer cart page.',
                showConfirmButton: true
            }).then(() => window.location.href = 'admin.html');
            return false;
        }

        return true;
    };

    const setCartCache = (items) => {
        cartCache = Array.isArray(items) ? items.map(item => ({
            ...item,
            selected: item.selected !== false
        })) : [];
        cartLoaded = true;
    };

    const getCart = () => cartCache;

    const fetchCart = () => {
        const token = getStoredToken();
        if (!token) {
            setCartCache([]);
            return Promise.resolve([]);
        }

        return $.ajax({
            method: 'GET',
            url: `${url}api/v1/cart`,
            headers: authHeaders(),
            dataType: 'json'
        }).then((response) => {
            const items = Array.isArray(response.cart) ? response.cart : [];
            setCartCache(items);
            return items;
        }).catch((error) => {
            console.warn('Unable to load cart from server', error);
            setCartCache([]);
            return [];
        });
    };

    const saveCart = (cart) => {
        const selectedByItemId = new Map((cart || []).map(item => [Number(item.item_id), item.selected !== false]));
        setCartCache(cart);
        const token = getStoredToken();
        if (!token) {
            return Promise.resolve(cart);
        }

        const payload = {
            items: cart.map(item => ({
                item_id: Number(item.item_id),
                quantity: Number(item.quantity || 0)
            }))
        };

        return $.ajax({
            method: 'PUT',
            url: `${url}api/v1/cart`,
            headers: authHeaders(),
            data: JSON.stringify(payload),
            contentType: 'application/json; charset=utf-8',
            dataType: 'json'
        }).then((response) => {
            const items = Array.isArray(response.cart) ? response.cart : cart;
            const mergedItems = Array.isArray(items) ? items.map(item => ({
                ...item,
                selected: selectedByItemId.get(Number(item.item_id)) !== false
            })) : items;
            setCartCache(mergedItems);
            return mergedItems;
        }).catch((error) => {
            console.warn('Unable to save cart to server', error);
            return cart;
        });
    };

    const isLoggedIn = () => {
        return !!getStoredToken() && isCustomerUser();
    };

    function renderCart() {
        let cart = getCart();
        let html = '';
        let total = 0;
        let selectedTotal = 0;
        let selectedCount = 0;
        if (!isLoggedIn()) {
            html = `
                <div style="text-align:center; padding:3rem; color:var(--muted);">
                    <h3>You should be logged in to purchase.</h3>
                    <p>Please <a href="login.html" style="color:var(--bordeaux); text-decoration:underline;">login</a> to access your cart and checkout.</p>
                    <a class="btn btn-primary" href="login.html">Login</a>
                </div>
            `;
            $('#cartTable').html(html);
            $('#cartCountPill').text('0 items');
            if (document.getElementById('summarySubtotal')) document.getElementById('summarySubtotal').textContent = '₱0.00';
            if (document.getElementById('summaryShipping')) document.getElementById('summaryShipping').textContent = '₱0.00';
            if (document.getElementById('summaryTotal')) document.getElementById('summaryTotal').textContent = '₱0.00';
            return;
        }
        if (cart.length === 0) {
            html = '<p style="text-align:center; padding:2rem; color:var(--muted);">Your cart is empty.</p>';
        } else {
            html = `<table class="table table-bordered cart-table">
                <thead>
                    <tr>
                        <th style="width:48px"><input type="checkbox" id="selectAll"></th>
                        <th>Image</th>
                        <th>Item</th>
                        <th>Price</th>
                        <th>Qty</th>
                        <th>Subtotal</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>`;
            cart.forEach((item, idx) => {
                // ensure selected flag exists (default true)
                if (typeof item.selected === 'undefined') item.selected = true;
                let subtotal = item.price * item.quantity;
                total += subtotal;
                if (item.selected) {
                    selectedTotal += subtotal;
                    selectedCount += item.quantity;
                }
                html += `<tr class="cart-row ${item.selected ? '' : 'cart-row-unselected'}" data-idx="${idx}">
                    <td><input type="checkbox" class="select-item" data-idx="${idx}" ${item.selected ? 'checked' : ''}></td>
                    <td>
                        <div class="thumb-wrap" style="position:relative; display:inline-block;">
                            <img src="${item.image}" width="64" height="64" style="object-fit:cover;border-radius:6px; display:block;" alt="thumb">
                            <button class="thumb-arrow left" data-idx="${idx}" style="position:absolute; left:-6px; top:50%; transform:translateY(-50%); border-radius:50%; width:26px; height:26px; border:0; background:rgba(0,0,0,0.06);">‹</button>
                            <button class="thumb-arrow right" data-idx="${idx}" style="position:absolute; right:-6px; top:50%; transform:translateY(-50%); border-radius:50%; width:26px; height:26px; border:0; background:rgba(0,0,0,0.06);">›</button>
                        </div>
                    </td>
                    <td>
                        <div class="item-cell-name">${item.description}</div>
                        <div class="item-cell-meta">${item.meta || ''}</div>
                    </td>
                    <td class="row-price" data-price="${item.price}">₱ ${item.price.toFixed(2)}</td>
                    <td>
                        <div class="qty-stepper">
                            <button type="button" class="qty-minus" data-idx="${idx}" aria-label="Decrease quantity">−</button>
                            <input type="number" class="qty-input" data-idx="${idx}" value="${item.quantity}" min="1" aria-label="Quantity">
                            <button type="button" class="qty-plus" data-idx="${idx}" aria-label="Increase quantity">+</button>
                        </div>
                    </td>
                    <td class="row-subtotal">₱ ${(subtotal).toFixed(2)}</td>
                    <td><button class="btn btn-danger btn-sm remove-item" data-idx="${idx}" aria-label="Remove">&times;</button></td>
                </tr>`;
            });
            html += `</tbody></table>
                <div class="cart-totals" style="margin-top: 2rem; padding: 1.5rem; background: var(--bone); border: 1px solid var(--line); border-radius: var(--radius); text-align: right;">
                    <div class="cart-total-label" style="font-family:var(--font-body); font-size:0.9rem; color:var(--muted); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.6rem;">Selected total</div>
                    <div class="cart-selected-total" style="font-family:var(--font-display); font-size:1.8rem; font-weight:700; color:var(--bordeaux); margin-bottom:0.8rem;">₱${selectedTotal.toFixed(2)}</div>
                    <div style="border-top:2px solid var(--line); padding-top:0.8rem; text-align:right;">
                        <div style="font-family:var(--font-body); font-size:0.85rem; color:var(--muted); margin-bottom:0.4rem;">Items selected: <strong style="color:var(--ink);" class="cart-items-count">${selectedCount}</strong></div>
                    </div>
                </div>`;
        }

        $('#cartTable').html(html);
        
        // Update cart count pill
        let totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        $('#cartCountPill').text(totalItems + ' item' + (totalItems !== 1 ? 's' : ''));
        
        recalcCartTotals();
    }

    function recalcCartTotals() {
        const cart = getCart();
        let subtotal = 0;
        let selectedSubtotal = 0;
        let selectedCount = 0;
        cart.forEach(item => {
            if (typeof item.selected === 'undefined') item.selected = true;
            const price = parseFloat(item.price || 0);
            const qty = parseInt(item.quantity || 0, 10) || 0;
            const line = price * qty;
            subtotal += line;
            if (item.selected) {
                selectedSubtotal += line;
                selectedCount += qty;
            }
        });

        const shipping = selectedSubtotal > 0 ? 150 : 0;
        const discountPct = window.__retroDiscountPct || 0;
        const discount = selectedSubtotal * discountPct;
        const total = Math.max(selectedSubtotal - discount + shipping, 0);

        // update selected total in cart area with items count
        $('.cart-selected-total').text('\u20b1' + selectedSubtotal.toLocaleString('en-PH', {minimumFractionDigits:2}));
        $('.cart-items-count').text(selectedCount);

        // update summary sidebar - show SELECTED amounts, not all items
        const subtotalEl = document.getElementById('summarySubtotal');
        const shippingEl = document.getElementById('summaryShipping');
        const discountRow = document.getElementById('summaryDiscountRow');
        const discountEl = document.getElementById('summaryDiscount');
        const totalEl = document.getElementById('summaryTotal');

        if (subtotalEl) subtotalEl.textContent = '\u20b1' + selectedSubtotal.toLocaleString('en-PH', {minimumFractionDigits:2});
        if (shippingEl) shippingEl.textContent = '\u20b1' + shipping.toLocaleString('en-PH', {minimumFractionDigits:2});
        if (discountRow && discountEl) {
            if (discount > 0) {
                discountRow.style.display = 'flex';
                discountEl.textContent = '\u2212\u20b1' + discount.toLocaleString('en-PH', {minimumFractionDigits:2});
            } else {
                discountRow.style.display = 'none';
            }
        }
        if (totalEl) totalEl.textContent = '\u20b1' + total.toLocaleString('en-PH', {minimumFractionDigits:2});
    }

    // function getUserId() {
    //     let userId = sessionStorage.getItem('userId');

    //     return userId ?? '';
    // }

    const getToken = () => {
        const token = getStoredToken();
        if (!token) {
            Swal.fire({
                icon: 'warning',
                text: 'You must be logged in to access this page.',
                showConfirmButton: true
            }).then(() => {
                window.location.href = 'login.html';
            });
            return;
        }
        return token;
    }

    $('#cartTable').on('click', '.remove-item', function () {
        let idx = $(this).data('idx');
        let cart = getCart();
        cart.splice(idx, 1);
        saveCart(cart).then(renderCart);
    });

    // handle select all
    $('#cartTable').on('change', '#selectAll', function () {
        let checked = $(this).is(':checked');
        let cart = getCart();
        cart.forEach(item => item.selected = checked);
        saveCart(cart).then(renderCart);
    });

    // handle single select checkbox
    $('#cartTable').on('change', '.select-item', function () {
        let idx = $(this).data('idx');
        let cart = getCart();
        if (cart[idx]) cart[idx].selected = $(this).is(':checked');
        saveCart(cart).then(renderCart);
    });

    // qty stepper handlers
    $('#cartTable').on('click', '.qty-minus', function () {
        let idx = $(this).data('idx');
        let cart = getCart();
        if (!cart[idx]) return;
        cart[idx].quantity = Math.max(1, (parseInt(cart[idx].quantity, 10) || 1) - 1);
        saveCart(cart).then(renderCart);
    });

    $('#cartTable').on('click', '.qty-plus', function () {
        let idx = $(this).data('idx');
        let cart = getCart();
        if (!cart[idx]) return;
        cart[idx].quantity = (parseInt(cart[idx].quantity, 10) || 1) + 1;
        saveCart(cart).then(renderCart);
    });

    // thumbnail arrow click (demo only: rotate between images if item.images array exists)
    $('#cartTable').on('click', '.thumb-arrow', function (e) {
        e.preventDefault();
        const idx = $(this).data('idx');
        const dir = $(this).hasClass('left') ? -1 : 1;
        const cart = getCart();
        const item = cart[idx];
        if (!item) return;
        if (!Array.isArray(item.images) || item.images.length === 0) return;
        item._activeImage = item._activeImage || 0;
        item._activeImage = (item._activeImage + dir + item.images.length) % item.images.length;
        item.image = item.images[item._activeImage];
        saveCart(cart);
        renderCart();
    });

    $('#cartTable').on('change', '.qty-input', function () {
        let idx = $(this).data('idx');
        let val = parseInt($(this).val(), 10) || 1;
        let cart = getCart();
        if (!cart[idx]) return;
        cart[idx].quantity = Math.max(1, val);
        saveCart(cart).then(renderCart);
    });

    // voucher handling
    $('#voucherApplyBtn').on('click', function () {
        const code = ($('#voucherInput').val() || '').trim();
        if (!code) {
            $('#voucherMsg').text('Enter a voucher code.');
            return;
        }
        // demo voucher: RETRO10 -> 10% off
        if (code.toUpperCase() === 'RETRO10') {
            window.__retroDiscountPct = 0.10;
            $('#voucherMsg').text('Voucher applied: 10% off selected items');
        } else {
            window.__retroDiscountPct = 0;
            $('#voucherMsg').text('Invalid voucher');
        }
        renderCart();
        recalcCartTotals();
    });

    loadSharedHeader();
    if (requireCustomer()) {
        fetchCart().then(renderCart);
    }

    $('#checkoutBtn').on('click', function () {
        let cart = getCart()

        if (cart.length === 0) {
            Swal.fire('Cart Empty', 'Add items to your cart before checking out.', 'info');
            return;
        }

        const token = getToken();
        if (!token) {
            return;
        }

        // Check if any items are selected
        const selectedItems = cart.filter(i => i.selected);
        if (selectedItems.length === 0) {
            Swal.fire('No items selected', 'Please select items in your cart to checkout.', 'info');
            return;
        }

        // Redirect to checkout page (order will be created there)
        window.location.href = 'checkout.html';
    });

    renderCart()

})
