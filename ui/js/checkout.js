$(document).ready(function () {
    const url = 'http://localhost:3000/';

    function getCart() {
        let cart = localStorage.getItem('cart');
        return cart ? JSON.parse(cart) : [];
    }

    function getToken() {
        const token = sessionStorage.getItem('token');
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
        return JSON.parse(token);
    }

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
        const shippingData = {
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
        
        // Show success and proceed
        Swal.fire({
            icon: 'success',
            title: 'Shipping Info Saved',
            text: 'Proceeding to payment...',
            timer: 1500,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        }).then(() => {
            placeOrder(shippingData);
        });
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
        const cart = getCart();
        const selectedItems = cart.filter(i => i.selected);

        if (selectedItems.length === 0) {
            Swal.fire('Cart Empty', 'Your cart is empty.', 'warning');
            return;
        }

        const token = getToken();
        if (!token) return;

        // Get order summary data
        const orderData = renderOrderSummary();

        const payload = JSON.stringify({
            items: selectedItems.map(item => ({
                item_id: item.item_id,
                quantity: item.quantity,
                price: item.price
            })),
            shipping: shippingData,
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
                    title: 'Order Confirmed!',
                    text: data.message || 'Your order has been placed successfully.',
                    timer: 2500,
                    showConfirmButton: false
                }).then(() => {
                    // Remove only selected items from cart
                    let updatedCart = getCart().filter(i => !i.selected);
                    localStorage.setItem('cart', JSON.stringify(updatedCart));
                    window.location.href = 'home.html';
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

    // Initial render
    loadSharedHeader(() => {
        renderOrderSummary();
        
        // Check if user is logged in
        const token = sessionStorage.getItem('token');
        if (!token) {
            Swal.fire({
                icon: 'warning',
                title: 'Login Required',
                text: 'You must be logged in to checkout.',
                showConfirmButton: true
            }).then(() => {
                window.location.href = 'login.html';
            });
        }

        // Check if cart has selected items
        const cart = getCart();
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
        }
    });
});
