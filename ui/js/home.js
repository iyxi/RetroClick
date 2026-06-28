$(document).ready(function () {
    const url = 'http://localhost:3000/'
    var itemCount = 0;
    var priceTotal = 0;
    var quantity = 0;

    const getCart = () => {
        let cart = localStorage.getItem('cart');
        return cart ? JSON.parse(cart) : [];
    }

    const saveCart = cart => {
        localStorage.setItem('cart', JSON.stringify(cart));
    }

    const isLoggedIn = () => {
        return !!sessionStorage.getItem('token');
    };

    const requireLogin = () => {
        if (!isLoggedIn()) {
            Swal.fire({
                icon: 'warning',
                text: 'Please log in before adding items to your cart.',
                confirmButtonText: 'Login'
            }).then(() => {
                window.location.href = 'login.html';
            });
            return false;
        }
        return true;
    };

    const params = new URLSearchParams(window.location.search);
    const brandFilter = params.get('brand')?.trim().toLowerCase();

    $.ajax({
        method: "GET",
        url: `${url}api/v1/public/items`,
        dataType: 'json',
        success: function (data) {
            // console.log(data);
            $("#items").empty();

            const items = data.rows.filter(item => {
                if (!brandFilter) return true;
                return String(item.camera_brand || '').trim().toLowerCase() === brandFilter;
            });

            if (brandFilter && items.length === 0) {
                $('#items').html(`<p class="text-center mt-4">No items found for brand <strong>${brandFilter}</strong>.</p>`);
                return;
            }

            let row;
            $.each(items, function (key, value) {
                if (key % 4 === 0) {
                    row = $('<div class="row"></div>');
                    $("#items").append(row);
                }
                // console.log(key);
                const stockQty = value.quantity ?? 0;
                const imagePath = value.img_path ? `${url}${encodeURI(value.img_path)}` : 'https://via.placeholder.com/400x250?text=No+Image';
                const item = `<div class="col-md-3 mb-4">
                <div class="card h-100">
                <img src="${imagePath}" class="card-img-top" alt="${value.description}" >
                <div class="card-body">
                <h5 class="card-title">${value.camera_model || value.description}</h5>
                <p class="card-text text-uppercase small text-muted mb-2">${value.camera_brand || 'Vintage'}</p>
                <p class="card-text">₱ ${parseFloat(value.sell_price).toFixed(2)}</p>
                <p class="card-text">
                <small class="text-muted">Stock: ${stockQty}</small>
                </p>
                <a href="#!" class="btn btn-primary show-details" role="button" data-id="${value.item_id}" data-description="${value.description}" data-price="${value.sell_price}" data-image="${imagePath}" data-stock="${stockQty}">Add to Cart</a>
                </div>
                </div>
                </div>`;
                row.append(item);

            });
            if ($('#productDetailsModal').length === 0) {
                $('body').append(`
                    <div class="modal fade" id="productDetailsModal" tabindex="-1" role="dialog" aria-labelledby="productDetailsModalLabel" aria-hidden="true">
                      <div class="modal-dialog modal-dialog-centered" role="document">
                        <div class="modal-content">
                          <div class="modal-header">
                            <h5 class="modal-title" id="productDetailsModalLabel"></h5>
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                              <span aria-hidden="true">&times;</span>
                            </button>
                          </div>
                          <div class="modal-body text-center" id="productDetailsModalBody">
                            <!-- Product details will be injected here -->
                          </div>
                        </div>
                      </div>
                    </div>
                    `);
            }

            $(".show-details").on('click', function () {

                const id = $(this).data('id');
                const description = $(this).data('description');
                const price = $(this).data('price');
                const image = $(this).data('image');
                const stock = $(this).data('stock');


                $('#productDetailsModalLabel').text(description);
                $('#productDetailsModalBody').html(`
                        <img src="${image}" class="img-fluid mb-3" style="max-height:200px;">
                        <p id="price">Price: ₱<strong>${price}</strong></p>
                        <p>Stock: ${stock}</p>
                        <input type="number" class="form-control mb-3" id="detailsQty" min="1" max="${stock}" value="1">
                        <input type="hidden" id="detailsItemId" value="${id}">
                        <button type="button" class="btn btn-primary" id="detailsAddToCart">Add to Cart</button>
                    `);

                // Show modal
                $('#productDetailsModal').modal('show');
            })

        },
        error: function (error) {
            console.log(error);

        }
    });

    $(document).on('click', '#detailsAddToCart', function () {
        if (!requireLogin()) {
            return;
        }

        const qty = parseInt($("#detailsQty").val());
        const id = parseInt($("#detailsItemId").val());
        const description = $("#productDetailsModalLabel").text();
        const price = $("#productDetailsModalBody strong").text().replace(/[^\d.]/g, '');
        const image = $("#productDetailsModalBody img").attr('src');
        const stock = parseInt($("#productDetailsModalBody p:contains('Stock')").text().replace(/[^\d]/g, ''));

        if (!qty || qty < 1 || qty > stock) {
            Swal.fire('Invalid Quantity', `Choose between 1 and ${stock}.`, 'warning');
            return;
        }

        let cart = getCart();

        let existing = cart.find(item => item.item_id == id);
        if (existing) {
            existing.quantity += qty;
        } else {
            cart.push({
                item_id: id,
                description: description,
                price: parseFloat(price),
                image: image,
                stock: stock,
                quantity: qty
            });
        }
        saveCart(cart);

        itemCount++;
        $('#itemCount').text(itemCount).css('display', 'block');
        $('#productDetailsModal').modal('hide')
        Swal.fire('Added to Cart', `${description} was added to your cart.`, 'success');
        // console.log(cart)

    });

    loadSharedHeader();

})
