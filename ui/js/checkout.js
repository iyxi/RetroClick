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

    function renderCheckout() {
        const cart = getCart();
        if (cart.length === 0) {
            $('#checkoutContent').html('<div class="alert alert-info">Your cart is empty. Add items before checking out.</div>');
            $('#placeOrderBtn').prop('disabled', true);
            return;
        }

        let total = 0;
        let html = `<div class="table-responsive">
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th>Image</th>
                        <th>Product</th>
                        <th>Price</th>
                        <th>Quantity</th>
                        <th>Subtotal</th>
                    </tr>
                </thead>
                <tbody>`;

        cart.forEach(item => {
            const subtotal = item.price * item.quantity;
            total += subtotal;
            html += `<tr>
                    <td><img src="${item.image}" width="70" /></td>
                    <td>${item.description}</td>
                    <td>₱ ${item.price.toFixed(2)}</td>
                    <td>${item.quantity}</td>
                    <td>₱ ${subtotal.toFixed(2)}</td>
                </tr>`;
        });

        html += `</tbody>
            </table>
        </div>
        <div class="card p-3">
            <h4>Order Summary</h4>
            <p><strong>Total:</strong> ₱ ${total.toFixed(2)}</p>
            <p><strong>Payment method:</strong> Cash on delivery</p>
            <p><strong>Note:</strong> This checkout page submits the order to the backend and clears the cart.</p>
        </div>`;

        $('#checkoutContent').html(html);
        $('#placeOrderBtn').prop('disabled', false);
    }

    $('#placeOrderBtn').on('click', function () {
        const cart = getCart();
        if (cart.length === 0) {
            Swal.fire('Cart Empty', 'Your cart is empty.', 'info');
            return;
        }

        const token = getToken();
        if (!token) return;

        const payload = {
            cart: cart.map(item => ({
                item_id: item.item_id,
                price: item.price,
                quantity: item.quantity
            })),
            user: {
                id: JSON.parse(sessionStorage.getItem('userId'))
            }
        };

        Swal.fire({
            title: 'Confirm Order',
            text: 'Place this order now?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, place order'
        }).then(result => {
            if (!result.isConfirmed) return;

            $.ajax({
                type: 'POST',
                url: `${url}api/v1/orders`,
                data: JSON.stringify(payload),
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                headers: {
                    'Authorization': 'Bearer ' + token
                },
                success: function (response) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Order placed',
                        text: response.message || 'Your order has been created.',
                        timer: 1800,
                        showConfirmButton: false
                    }).then(() => {
                        localStorage.removeItem('cart');
                        window.location.href = 'home.html';
                    });
                },
                error: function (xhr) {
                    const errorMessage = xhr.responseJSON?.message || xhr.responseJSON?.error || 'Checkout failed';
                    Swal.fire({
                        icon: 'error',
                        title: 'Checkout failed',
                        text: errorMessage
                    });
                }
            });
        });
    });

    loadSharedHeader(renderCheckout);
});
