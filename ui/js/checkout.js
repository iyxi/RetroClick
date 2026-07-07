$(document).ready(function () {
    const url = 'http://localhost:3000/';
    let shippingData = null;
    let paymentMethod = 'COD';
    let currentStep = 1;

    let cartCache = [];

    const getStoredToken = () => {
        const rawToken = sessionStorage.getItem('token');
        if (!rawToken) {
            return null;
        }

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

    const isCustomerUser = () => {
        const role = String(getStoredUserRole() || '').toLowerCase();
        return !role || role === 'customer';
    };

    const authHeaders = () => {
        const token = getStoredToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const getCart = () => cartCache;

    const setCartCache = (items) => {
        cartCache = Array.isArray(items) ? items.map(item => ({
            ...item,
            selected: item.selected !== false
        })) : [];
    };

    const requireCustomer = () => {
        if (!getStoredToken()) {
            window.location.href = 'login.html';
            return false;
        }
        if (!isCustomerUser()) {
            window.location.href = 'admin.html';
            return false;
        }
        return true;
    };

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

    function getStoredUserEmail() {
        const rawEmail = sessionStorage.getItem('userEmail');
        if (!rawEmail) {
            return '';
        }

        try {
            return JSON.parse(rawEmail);
        } catch (error) {
            return rawEmail;
        }
    }

    function getToken() {
        const token = getStoredToken();
        if (!token) {
            Swal.fire({
                icon: 'warning',
                text: 'You must be logged in to checkout.',
                showConfirmButton: true
            }).then(() => {
                window.location.href = 'login.html';
            });
            return null;
        }
        return token;
    }

    const storedEmail = getStoredUserEmail();
    if (storedEmail && !$('#checkoutEmail').val().trim()) {
        $('#checkoutEmail').val(storedEmail);
    }

    const getSelectedPaymentMethod = () => $('input[name="paymentMethod"]:checked').val() || 'COD';

    const formatMoney = (value) => `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

    const escapeHtml = (value) => String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const formatReceiptDate = (inputDate = new Date()) => {
        const date = new Date(inputDate);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${month}/${day}/${year} ${hours}:${minutes}`;
    };

    const getSelectedItems = () => getCart().filter(item => item.selected);

    const buildReceiptHtml = ({ receiptOrderId, selectedItems, shipping, paymentMethod: chosenPaymentMethod, total, subtotal, discount, shippingFee, datePlaced, status = 'Pending', previewMode = false }) => {
        const itemsHtml = selectedItems.map(item => {
            const itemName = escapeHtml(item.description || item.name || `Item #${item.item_id || ''}`);
            const qty = Number(item.quantity || 0);
            const unitPrice = Number(item.price || 0);
            const lineTotal = unitPrice * qty;

            return `
                <li>
                    <div class="receipt-item-name">${itemName}</div>
                    <div class="receipt-item-meta">${qty} x ${formatMoney(unitPrice)}</div>
                    <div class="receipt-item-total">${formatMoney(lineTotal)}</div>
                </li>
            `;
        }).join('');

        const orderNo = previewMode ? 'PREVIEW' : String(receiptOrderId || 'N/A').padStart(6, '0');
        const customerName = escapeHtml(shipping?.fullname || 'Customer');
        const customerAddress = [shipping?.address1, shipping?.address2, shipping?.city, shipping?.province, shipping?.zip, shipping?.country]
            .filter(Boolean)
            .map(escapeHtml)
            .join(', ');
        const shownDate = formatReceiptDate(datePlaced || new Date());
        const normalizedStatus = String(status || 'Pending').toLowerCase();
        const statusLabel = normalizedStatus === 'completed' ? 'COMPLETED' : normalizedStatus === 'processing' ? 'PROCESSING' : normalizedStatus === 'cancelled' ? 'CANCELLED' : 'PENDING';
        const statusMessage = normalizedStatus === 'completed'
            ? 'Your order is complete. Thank you and order again soon.'
            : normalizedStatus === 'processing'
                ? 'Your order is now processing. Please wait for delivery.'
                : normalizedStatus === 'cancelled'
                    ? 'Your order has been cancelled. If you need help, contact support.'
                    : 'Your order is pending and will be processed shortly.';

        return `
            <div class="vintage-receipt">
                <div class="receipt-status-banner">
                    <div class="receipt-status-pill status-${normalizedStatus}">${statusLabel}</div>
                    <div class="receipt-status-copy">${statusMessage}</div>
                </div>
                <div class="receipt-topline">
                    <span>RECEIPT</span>
                    <span>No. ${orderNo}</span>
                </div>
                <h3 class="receipt-brand">RetroClick</h3>
                <p class="receipt-tagline">Vintage camera marketplace</p>

                <div class="receipt-divider"></div>

                <div class="receipt-meta-row"><span>DATE:</span><span>${shownDate}</span></div>
                <div class="receipt-meta-row"><span>CUSTOMER:</span><span>${customerName}</span></div>
                <div class="receipt-meta-row"><span>PAYMENT:</span><span>${escapeHtml(chosenPaymentMethod || 'COD')}</span></div>
                <div class="receipt-meta-row"><span>EMAIL:</span><span>${escapeHtml(shipping?.email || '')}</span></div>
                <div class="receipt-address">${customerAddress || 'Address to be confirmed'}</div>

                <div class="receipt-divider"></div>

                <ul class="receipt-items-list">
                    ${itemsHtml || '<li><div class="receipt-item-name">No items</div><div class="receipt-item-total">-</div></li>'}
                </ul>

                <div class="receipt-divider"></div>

                <div class="receipt-amount-row"><span>SUBTOTAL</span><span>${formatMoney(subtotal)}</span></div>
                <div class="receipt-amount-row"><span>SHIPPING</span><span>${formatMoney(shippingFee)}</span></div>
                ${discount > 0 ? `<div class="receipt-amount-row"><span>DISCOUNT</span><span>-${formatMoney(discount)}</span></div>` : ''}
                <div class="receipt-total-row"><span>TOTAL:</span><span>${formatMoney(total)}</span></div>

                <p class="receipt-thanks">Thank you!</p>

                ${previewMode ? '<p class="receipt-preview-note">Preview only. Final receipt number is generated after placing order.</p>' : ''}
            </div>
        `;
    };

    const buildReviewReceiptHtml = () => {
        const selectedItems = getSelectedItems();
        const orderData = renderOrderSummary();
        paymentMethod = getSelectedPaymentMethod();

        return buildReceiptHtml({
            receiptOrderId: 'PREVIEW',
            selectedItems,
            shipping: shippingData || {},
            paymentMethod,
            total: orderData.total,
            subtotal: orderData.subtotal,
            discount: orderData.discount,
            shippingFee: orderData.shipping,
            previewMode: true
        });
    };

    const renderReviewReceipt = () => {
        $('#reviewReceipt').html(buildReviewReceiptHtml());
    };

    const updateStepUI = () => {
        $('#checkoutStepShipping').toggleClass('is-active', currentStep === 1);
        $('#checkoutStepPayment').toggleClass('is-active', currentStep === 2);
        $('#checkoutStepReview').toggleClass('is-active', currentStep === 3);

        $('.checkout-steps .checkout-step').removeClass('is-current is-complete');
        $('.checkout-steps .checkout-step').each(function (index) {
            const stepNumber = index + 1;
            if (stepNumber === currentStep) {
                $(this).addClass('is-current');
            } else if (stepNumber < currentStep) {
                $(this).addClass('is-complete');
            }
        });

        if (currentStep === 3) {
            renderReviewReceipt();
        }
    };

    const setStep = (step) => {
        currentStep = step;
        updateStepUI();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    function renderOrderSummary() {
        const cart = getCart();
        let subtotal = 0;
        let selectedCount = 0;
        let html = '';

        // Only show selected items
        cart.forEach(item => {
            if (item.selected) {
                const lineSubtotal = item.price * item.quantity;
                subtotal += lineSubtotal;
                selectedCount += item.quantity;
                
                html += `
                    <div class="item-cell" style="margin-bottom:.85rem;">
                        <div class="item-thumb">
                            <img src="${item.image}" alt="${item.description}" style="width:60px; height:60px; object-fit:cover; border-radius:6px;">
                        </div>
                        <div style="flex:1;">
                            <div class="item-cell-name">${item.description}</div>
                            <div class="item-cell-meta">Qty ${item.quantity} · ₱${item.price.toFixed(2)}</div>
                        </div>
                        <div style="text-align:right; font-weight:700; color:var(--ink);">₱${lineSubtotal.toFixed(2)}</div>
                    </div>
                `;
            }
        });

        if (selectedCount === 0) {
            html = '<p style="text-align:center; color:var(--muted);">No items selected in cart.</p>';
        }

        $('#checkoutSummaryItems').html(html);

        // Calculate totals based on selected items only
        const shipping = selectedCount > 0 ? 150 : 0;
        const discountPct = window.__retroDiscountPct || 0;
        const discount = subtotal * discountPct;
        const total = Math.max(subtotal - discount + shipping, 0);

        // Update summary display
        $('#checkoutSubtotal').text('₱' + subtotal.toLocaleString('en-PH', {minimumFractionDigits:2}));
        $('#checkoutShipping').text('₱' + shipping.toLocaleString('en-PH', {minimumFractionDigits:2}));
        $('#checkoutTotal').text('₱' + total.toLocaleString('en-PH', {minimumFractionDigits:2}));

        // Show/hide discount row
        const discountRow = $('#checkoutDiscountRow');
        if (discount > 0) {
            discountRow.show();
            $('#checkoutDiscount').text('−₱' + discount.toLocaleString('en-PH', {minimumFractionDigits:2}));
        } else {
            discountRow.hide();
        }

        return {subtotal, selectedCount, total, discount, shipping};
    }

    // Handle "Continue to Payment" button
    $('#continuePaymentBtn').on('click', function(e) {
        e.preventDefault();
        
        // Clear previous error states
        $('.form-group').removeClass('has-error');
        $('.field-error').remove();

        // Get form values
        const email = $('#checkoutEmail').val().trim();
        const fullname = $('#checkoutFullName').val().trim();
        const address1 = $('#checkoutAddress1').val().trim();
        const city = $('#checkoutCity').val().trim();
        const province = $('#checkoutProvince').val().trim();
        const zip = $('#checkoutZip').val().trim();
        const country = $('#checkoutCountry').val();

        // Validate all required fields
        const errors = [];
        const invalidFields = [];

        // Email validation
        if (!email) {
            errors.push('✗ Email address is required');
            invalidFields.push('#checkoutEmail');
        } else if (!isValidEmail(email)) {
            errors.push('✗ Please enter a valid email address (example: user@email.com)');
            invalidFields.push('#checkoutEmail');
        }

        // Full name validation
        if (!fullname) {
            errors.push('✗ Full name is required');
            invalidFields.push('#checkoutFullName');
        } else if (fullname.length < 2) {
            errors.push('✗ Full name must be at least 2 characters');
            invalidFields.push('#checkoutFullName');
        }

        // Address validation
        if (!address1) {
            errors.push('✗ Address line 1 is required');
            invalidFields.push('#checkoutAddress1');
        } else if (address1.length < 5) {
            errors.push('✗ Address must be at least 5 characters');
            invalidFields.push('#checkoutAddress1');
        }

        // City validation
        if (!city) {
            errors.push('✗ City is required');
            invalidFields.push('#checkoutCity');
        } else if (city.length < 2) {
            errors.push('✗ City must be at least 2 characters');
            invalidFields.push('#checkoutCity');
        }

        // Province validation
        if (!province) {
            errors.push('✗ State/Province is required');
            invalidFields.push('#checkoutProvince');
        } else if (province.length < 2) {
            errors.push('✗ State/Province must be at least 2 characters');
            invalidFields.push('#checkoutProvince');
        }

        // ZIP code validation
        if (!zip) {
            errors.push('✗ ZIP/Postal code is required');
            invalidFields.push('#checkoutZip');
        } else if (!/^\d{3,10}$/.test(zip.replace(/\s/g, ''))) {
            errors.push('✗ ZIP/Postal code must contain 3-10 digits only');
            invalidFields.push('#checkoutZip');
        }

        // Country validation
        if (!country) {
            errors.push('✗ Country is required');
            invalidFields.push('#checkoutCountry');
        }

        // If there are errors, highlight fields and show pop-up
        if (errors.length > 0) {
            // Highlight invalid fields
            invalidFields.forEach(fieldId => {
                $(fieldId).closest('.form-group').addClass('has-error');
                $(fieldId).addClass('is-invalid');
            });

            // Scroll to first invalid field
            const firstInvalidField = $(invalidFields[0]);
            if (firstInvalidField.length) {
                $('html, body').animate({
                    scrollTop: firstInvalidField.offset().top - 100
                }, 500);
            }

            // Show error pop-up
            Swal.fire({
                icon: 'error',
                title: 'Incomplete or Invalid Information',
                html: '<div style="text-align: left; font-size: 0.95rem; line-height: 1.8; max-height: 300px; overflow-y: auto;">' + 
                      errors.map(err => '<p style="margin: 0.5rem 0; color: var(--rust); font-weight: 600;">' + err + '</p>').join('') + 
                      '</div><p style="margin-top: 1rem; color: var(--muted); font-size: 0.9rem;">Please review the highlighted fields above.</p>',
                confirmButtonText: 'Back to checkout',
                confirmButtonColor: 'var(--bordeaux)',
                allowOutsideClick: false,
                allowEscapeKey: false
            });
            return;
        }

        // Remove any validation styling on successful validation
        invalidFields.forEach(fieldId => {
            $(fieldId).closest('.form-group').removeClass('has-error');
            $(fieldId).removeClass('is-invalid');
        });

        // Check if any items are selected
        const cart = getCart();
        const selectedItems = cart.filter(i => i.selected);
        if (selectedItems.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'No Items Selected',
                text: 'Please go back to cart and select items to checkout.',
                confirmButtonText: 'Go to Cart',
                confirmButtonColor: 'var(--cedar)'
            }).then(result => {
                if (result.isConfirmed) {
                    window.location.href = 'cart.html';
                }
            });
            return;
        }

        // Store shipping info in session
        shippingData = {
            email: email,
            fullname: fullname,
            address1: address1,
            address2: $('#checkoutAddress2').val().trim(),
            city: city,
            province: province,
            zip: zip,
            country: country
        };
        sessionStorage.setItem('checkoutData', JSON.stringify(shippingData));

        setStep(2);
    });

    $('#backToShippingBtn').on('click', function () {
        setStep(1);
    });

    $('#continueReviewBtn').on('click', function () {
        paymentMethod = getSelectedPaymentMethod();
        if (!paymentMethod) {
            Swal.fire('Payment Method Required', 'Please choose a payment method to continue.', 'warning');
            return;
        }
        setStep(3);
    });

    $('#backToPaymentBtn').on('click', function () {
        setStep(2);
    });

    $('#placeOrderBtn').on('click', function () {
        placeOrder(shippingData);
    });

    // Email validation helper
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Real-time validation as user types
    $('#checkoutEmail').on('blur', function() {
        const value = $(this).val().trim();
        if (value && !isValidEmail(value)) {
            $(this).closest('.form-group').addClass('has-error');
        } else {
            $(this).closest('.form-group').removeClass('has-error');
        }
    });

    $('#checkoutFullName').on('blur', function() {
        const value = $(this).val().trim();
        if (value && value.length < 2) {
            $(this).closest('.form-group').addClass('has-error');
        } else {
            $(this).closest('.form-group').removeClass('has-error');
        }
    });

    $('#checkoutAddress1').on('blur', function() {
        const value = $(this).val().trim();
        if (value && value.length < 5) {
            $(this).closest('.form-group').addClass('has-error');
        } else {
            $(this).closest('.form-group').removeClass('has-error');
        }
    });

    $('#checkoutCity').on('blur', function() {
        const value = $(this).val().trim();
        if (value && value.length < 2) {
            $(this).closest('.form-group').addClass('has-error');
        } else {
            $(this).closest('.form-group').removeClass('has-error');
        }
    });

    $('#checkoutProvince').on('blur', function() {
        const value = $(this).val().trim();
        if (value && value.length < 2) {
            $(this).closest('.form-group').addClass('has-error');
        } else {
            $(this).closest('.form-group').removeClass('has-error');
        }
    });

    $('#checkoutZip').on('blur', function() {
        const value = $(this).val().trim();
        if (value && !/^\d{3,10}$/.test(value.replace(/\s/g, ''))) {
            $(this).closest('.form-group').addClass('has-error');
        } else {
            $(this).closest('.form-group').removeClass('has-error');
        }
    });

    // Remove error styling when user starts fixing the field
    $('#checkoutEmail, #checkoutFullName, #checkoutAddress1, #checkoutCity, #checkoutProvince, #checkoutZip, #checkoutCountry').on('input change', function() {
        if ($(this).val().trim()) {
            $(this).closest('.form-group').removeClass('has-error');
        }
    });

    function placeOrder(shippingData) {
        const selectedItems = getSelectedItems();

        if (selectedItems.length === 0) {
            Swal.fire('Cart Empty', 'Your cart is empty.', 'warning');
            return;
        }

        const token = getToken();
        if (!token) return;

        // Get order summary data
        const orderData = renderOrderSummary();
        paymentMethod = getSelectedPaymentMethod();

        const payload = JSON.stringify({
            cart: selectedItems.map(item => ({
                item_id: item.item_id,
                quantity: item.quantity,
                price: item.price,
                name: item.name || item.description || '',
                description: item.description || item.name || ''
            })),
            shipping: shippingData,
            payment_method: paymentMethod,
            subtotal: orderData.subtotal,
            shipping_fee: orderData.shipping,
            discount: orderData.discount,
            total: orderData.total
        });

        Swal.fire({
            title: 'Confirming Order',
            html: '<p>Processing your order...</p>',
            icon: 'info',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        $.ajax({
            type: "POST",
            url: `${url}api/v1/orders`,
            data: payload,
            dataType: "json",
            contentType: 'application/json; charset=utf-8',
            headers: {
                "Authorization": "Bearer " + token
            },
            success: function (data) {
                const receiptOrderId = data.order?.orderinfo_id || data.order_id || 'N/A';
                const receiptHtml = buildReceiptHtml({
                    receiptOrderId,
                    selectedItems,
                    shipping: shippingData,
                    paymentMethod,
                    total: orderData.total,
                    subtotal: orderData.subtotal,
                    discount: orderData.discount,
                    shippingFee: orderData.shipping,
                    datePlaced: data.order?.date_placed || new Date(),
                    status: 'Pending',
                    previewMode: false
                });

                Swal.fire({
                    icon: 'success',
                    title: 'Order Confirmed!',
                    html: `<div class="swal-receipt-wrap">${receiptHtml}</div>`,
                    customClass: {
                        popup: 'receipt-swal-popup'
                    },
                    confirmButtonText: 'Back to Home',
                    allowOutsideClick: false
                }).then(() => {
                    // The backend removes purchased items from the active cart, so refresh state before redirecting.
                    fetchCart().finally(() => {
                        window.location.href = 'home.html';
                    });
                });
            },
            error: function (error) {
                console.log(error);
                const errorMessage = error.responseJSON?.message || error.responseJSON?.error || 'Order creation failed. Please try again.';
                Swal.fire({
                    icon: "error",
                    title: 'Order Failed',
                    text: errorMessage
                });
            }
        });
    }

    const initializeCheckout = () => {
        if (!requireCustomer()) return;

        fetchCart().then((cart) => {
            const selectedItems = cart.filter(i => i.selected);
            if (selectedItems.length === 0) {
                Swal.fire({
                    icon: 'info',
                    title: 'No Items Selected',
                    text: 'Please go back to your cart and select items to checkout.',
                    showConfirmButton: true
                }).then(() => {
                    window.location.href = 'cart.html';
                });
                return;
            }
            renderOrderSummary();
            updateStepUI();
        });
    };

    loadSharedHeader(() => {
        initializeCheckout();
    });
});
