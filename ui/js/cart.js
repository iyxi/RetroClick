$(document).ready(function () {
    const url = 'http://localhost:3000/'
    function getCart() {
        let cart = localStorage.getItem('cart');
        return cart ? JSON.parse(cart) : [];
    }

    function saveCart(cart) {
        localStorage.setItem('cart', JSON.stringify(cart));
    }

    function renderCart() {
        let cart = getCart();
        let html = '';
        let total = 0;
        let selectedTotal = 0;
        if (cart.length === 0) {
            html = '<p>Your cart is empty.</p>';
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
                if (item.selected) selectedTotal += subtotal;
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
                <div class="cart-totals" style="margin-top: .9rem; display:flex; justify-content:space-between; align-items:center; gap:1rem; flex-wrap:wrap;">
                    <div class="cart-totals-left"></div>
                    <div class="cart-totals-right">
                        <div style="text-align:right; font-family:var(--font-body); color:var(--muted);">Selected total</div>
                        <div class="cart-selected-total" style="font-family:var(--font-display); font-size:1.25rem; color:var(--bordeaux);">₱ ${selectedTotal.toFixed(2)}</div>
                        <div class="cart-grand-total" style="display:none;">₱ ${total.toFixed(2)}</div>
                    </div>
                </div>`;
        }

        $('#cartTable').html(html);
        recalcCartTotals();
    }

    function recalcCartTotals() {
        const cart = getCart();
        let subtotal = 0;
        let selectedSubtotal = 0;
        cart.forEach(item => {
            const price = parseFloat(item.price || 0);
            const qty = parseInt(item.quantity || 0, 10) || 0;
            const line = price * qty;
            subtotal += line;
            if (item.selected) selectedSubtotal += line;
        });

        const shipping = selectedSubtotal > 0 ? 150 : 0;
        const discountPct = window.__retroDiscountPct || 0;
        const discount = selectedSubtotal * discountPct;
        const total = Math.max(selectedSubtotal - discount + shipping, 0);

        // update small selected total in cart area
        $('.cart-selected-total').text('\u20b1 ' + selectedSubtotal.toLocaleString('en-PH', {minimumFractionDigits:2}));

        // update summary sidebar if present
        const subtotalEl = document.getElementById('summarySubtotal');
        const shippingEl = document.getElementById('summaryShipping');
        const discountRow = document.getElementById('summaryDiscountRow');
        const discountEl = document.getElementById('summaryDiscount');
        const totalEl = document.getElementById('summaryTotal');

        if (subtotalEl) subtotalEl.textContent = '\u20b1' + subtotal.toLocaleString('en-PH', {minimumFractionDigits:2});
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
        const token = sessionStorage.getItem('token');
        console.log(token)
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
        return JSON.parse(token)
    }

    $('#cartTable').on('click', '.remove-item', function () {
        let idx = $(this).data('idx');
        let cart = getCart();
        cart.splice(idx, 1);
        saveCart(cart);
        renderCart();
    });

    // handle select all
    $('#cartTable').on('change', '#selectAll', function () {
        let checked = $(this).is(':checked');
        let cart = getCart();
        cart.forEach(item => item.selected = checked);
        saveCart(cart);
        renderCart();
    });

    // handle single select checkbox
    $('#cartTable').on('change', '.select-item', function () {
        let idx = $(this).data('idx');
        let cart = getCart();
        if (cart[idx]) cart[idx].selected = $(this).is(':checked');
        saveCart(cart);
        renderCart();
    });

    // qty stepper handlers
    $('#cartTable').on('click', '.qty-minus', function () {
        let idx = $(this).data('idx');
        let cart = getCart();
        if (!cart[idx]) return;
        cart[idx].quantity = Math.max(1, (parseInt(cart[idx].quantity, 10) || 1) - 1);
        saveCart(cart);
        renderCart();
    });

    $('#cartTable').on('click', '.qty-plus', function () {
        let idx = $(this).data('idx');
        let cart = getCart();
        if (!cart[idx]) return;
        cart[idx].quantity = (parseInt(cart[idx].quantity, 10) || 1) + 1;
        saveCart(cart);
        renderCart();
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
        saveCart(cart);
        renderCart();
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

    $('#checkoutBtn').on('click', function () {

        itemCount = 0;
        priceTotal = 0;
        let cart = getCart()

        if (cart.length === 0) {
            Swal.fire('Cart Empty', 'Add items to your cart before checking out.', 'info');
            return;
        }

        const token = getToken();
        if (!token) {
            return;
        }

        // Only checkout selected items; leave others in cart
        const selectedItems = cart.filter(i => i.selected);
        if (selectedItems.length === 0) {
            Swal.fire('No items selected', 'Please select items in your cart to checkout.', 'info');
            return;
        }

        const payload = JSON.stringify({
            cart: selectedItems.map(item => ({
                item_id: item.item_id,
                quantity: item.quantity
            }))
        });

        $.ajax({
            type: "POST",
            url: `${url}api/v1/create-order`,
            data: payload,
            dataType: "json",
            contentType: 'application/json; charset=utf-8',
            headers: {
                "Authorization": "Bearer " + token
            },
            success: function (data) {
                Swal.fire({
                    icon: "success",
                    text: data.message || 'Checkout complete',
                    timer: 1800,
                    showConfirmButton: false
                }).then(() => {
                    // remove only the purchased items from cart, keep others
                    let current = getCart();
                    const remaining = current.filter(i => !i.selected);
                    saveCart(remaining);
                    renderCart();
                    window.location.href = 'home.html';
                });
            },
            error: function (error) {
                console.log(error);
                Swal.fire({
                    icon: "error",
                    text: error.responseJSON?.message || error.responseJSON?.error || 'Checkout failed'
                });
            }
        });


    });

    renderCart()

})
