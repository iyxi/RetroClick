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
        if (cart.length === 0) {
            html = '<p>Your cart is empty.</p>';
        } else {
            html = `<table class="table table-bordered">
                <thead>
                    <tr>
                        <th>Image</th>
                        <th>Description</th>
                        <th>Price</th>
                        <th>Qty</th>
                        <th>Subtotal</th>
                        <th>Remove</th>
                    </tr>
                </thead>
                <tbody>`;
            cart.forEach((item, idx) => {
                let subtotal = item.price * item.quantity;
                total += subtotal;
                html += `<tr>
                    <td><img src="${item.image}" width="60"></td>
                    <td>${item.description}</td>
                    <td>₱ ${item.price.toFixed(2)}</td>
                    <td>${item.quantity}</td>
                    <td>₱ ${(subtotal).toFixed(2)}</td>
                    <td><button class="btn btn-danger btn-sm remove-item" data-idx="${idx}">&times;</button></td>
                </tr>`;
            });
            html += `</tbody></table>
                <h4>Total: ₱ ${total.toFixed(2)}</h4>`;
        }

        $('#cartTable').html(html);
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

    $('#header').load("header.html");

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

        const payload = JSON.stringify({
            cart: cart.map(item => ({
                item_id: item.item_id,
                quantity: item.quantity
            }))
        });

        $.ajax({
            type: "POST",
            url: `${url}api/v1/create-order`,
            data: payload,
            dataType: "json",
            processData: false,
            contentType: 'application/json; charset=utf-8',
            headers: {
                "Authorization": "Bearer " + token
            },
            success: function (data) {
                Swal.fire({
                    icon: "success",
                    text: data.message || 'Checkout complete'
                });
                localStorage.removeItem('cart')
                renderCart();
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
