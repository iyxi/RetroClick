$(document).ready(function () {
    const url = 'http://localhost:3000/'
    var itemCount = 0;
    var priceTotal = 0;
    var quantity = 0;
    let shopItems = [];

    const normalizeText = (value) => String(value || '').trim().toLowerCase();
    const escapeHtml = (value) => String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const buildSearchSuggestions = (query) => {
      const normalizedQuery = normalizeText(query);
      if (!normalizedQuery) return [];

      const seen = new Set();
      const suggestions = [];

      shopItems.forEach((item) => {
        [item.camera_brand, item.camera_model, item.description, item.condition].forEach((value) => {
          const trimmed = String(value || '').trim();
          const normalizedValue = normalizeText(trimmed);
          if (!trimmed || !normalizedValue.includes(normalizedQuery) || seen.has(normalizedValue)) return;
          seen.add(normalizedValue);
          suggestions.push({
            label: trimmed,
            meta: item.camera_brand || item.condition || ''
          });
        });
      });

      return suggestions.sort((a, b) => a.label.localeCompare(b.label)).slice(0, 8);
    };

    const createSearchSuggestionMarkup = (suggestions) => {
      if (!suggestions.length) return '';
      return suggestions
        .map(
          (suggestion) => `
            <button
              type="button"
              class="search-suggestion-item"
              data-value="${escapeHtml(suggestion.label)}"
            >
              <span class="search-suggestion-title">${escapeHtml(suggestion.label)}</span>
              ${suggestion.meta ? `<span class="search-suggestion-meta">${escapeHtml(suggestion.meta)}</span>` : ''}
            </button>
          `
        )
        .join('');
    };

    const attachShopSearchAutocomplete = () => {
      const searchInput = $('#shopSearchInput');
      const searchBox = searchInput.closest('.search-box');
      let suggestionsRoot = $('#shopSearchSuggestions');

      if (!searchInput.length || !searchBox.length) return;

      if (!suggestionsRoot.length) {
        suggestionsRoot = $('<div class="search-suggestions d-none" id="shopSearchSuggestions" role="listbox" aria-live="polite"></div>');
        searchBox.append(suggestionsRoot);
      }

      const clearSuggestions = () => {
        suggestionsRoot.empty().addClass('d-none');
      };

      const renderSuggestions = (query) => {
        const suggestions = buildSearchSuggestions(query);
        if (!suggestions.length) {
          clearSuggestions();
          return;
        }
        suggestionsRoot.html(createSearchSuggestionMarkup(suggestions)).removeClass('d-none');
      };

      searchInput.on('input', function () {
        renderSuggestions(this.value);
      });

      searchInput.on('keydown', function (event) {
        if (event.key === 'Escape') {
          clearSuggestions();
        }
      });

      suggestionsRoot.on('click', '.search-suggestion-item', function () {
        const value = $(this).data('value');
        searchInput.val(value);
        clearSuggestions();
        searchInput.trigger('input');
      });

      $(document).on('click', function (event) {
        if (!$(event.target).closest('.search-box').length) {
          clearSuggestions();
        }
      });
    };

    window.filterByBrand = function (brand) {
      document.querySelectorAll('.filter-brand').forEach(function (box) {
        box.checked = !!brand && box.value === brand;
      });
      if (typeof applyAllFilters === 'function') {
        applyAllFilters();
      }
    };
    window.filterProducts = window.filterByBrand;

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

            shopItems = items;
            window.shopItems = items;

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
                const stockQty = value.quantity ?? 0;
                // Prefer ItemImages if present, otherwise fall back to img_path
                const imagesList = (value.ItemImages && value.ItemImages.length) ? value.ItemImages.slice() : [];
                if (!imagesList.length && value.img_path) {
                    imagesList.push({ image_path: value.img_path });
                }
                const primaryImage = imagesList.length ? imagesList[0].image_path : null;
                const imagePath = primaryImage ? `${url}${encodeURI(primaryImage)}` : 'https://via.placeholder.com/400x250?text=No+Image';
                     const imagesAttrEscaped = JSON.stringify(imagesList).replace(/</g, '\\u003c');
                                const item = `<div class="col-md-6 col-lg-3 mb-4">
                  <article class="product-card" data-item-id="${value.item_id}" data-images='${imagesAttrEscaped}' data-index="0">
                    <div class="product-image">
                      <button type="button" class="nav-arrow left" aria-label="Previous image">‹</button>
                      <img src="${imagePath}" alt="${escapeHtml(value.camera_model || value.description)}" />
                      <button type="button" class="nav-arrow right" aria-label="Next image">›</button>
                    </div>
                    <div class="product-body">
                      <div class="product-brand">${escapeHtml(value.camera_brand || 'Vintage')}</div>
                      <div class="product-title">${escapeHtml(value.camera_model || value.description)}</div>
                      <div class="product-description">${escapeHtml(value.description || '')}</div>
                      <div class="product-tags">
                        <span class="product-condition">${escapeHtml(value.condition || 'Unknown')}</span>
                        <span class="product-stock">Stock: ${stockQty}</span>
                      </div>
                      <div class="product-price">₱ ${parseFloat(value.sell_price).toFixed(2)}</div>
                      <div class="product-actions">
                        <button type="button" class="btn btn-outline-secondary btn-details show-details"
                          data-id="${value.item_id}"
                          data-description="${escapeHtml(value.description)}"
                          data-price="${value.sell_price}"
                          data-images='${JSON.stringify(imagesList)}'
                          data-stock="${stockQty}"
                          data-primary="${primaryImage || ''}">
                          Details
                        </button>
                        <button type="button" class="btn btn-primary btn-details show-details"
                          data-id="${value.item_id}"
                          data-description="${escapeHtml(value.description)}"
                          data-price="${value.sell_price}"
                          data-images='${JSON.stringify(imagesList)}'
                          data-stock="${stockQty}"
                          data-primary="${primaryImage || ''}">
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </article>
                </div>`;
                row.append(item);

            });

            attachShopSearchAutocomplete();

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
                // Read images reliably from the data attribute. jQuery.data may not parse complex JSON consistently,
                // so parse the attribute explicitly and fall back to .data() if needed.
                let images = [];
                const imagesAttr = $(this).attr('data-images');
                if (imagesAttr) {
                    try {
                        images = JSON.parse(imagesAttr);
                    } catch (err) {
                        images = $(this).data('images') || [];
                    }
                } else {
                    images = $(this).data('images') || [];
                }
                const stock = $(this).data('stock');

                const carouselId = `productCarousel-${id}`;
                const carouselIndicators = images.map((image, index) => `
                    <li data-target="#${carouselId}" data-slide-to="${index}" class="${index === 0 ? 'active' : ''}"></li>
                `).join('');
                const carouselItems = images.map((image, index) => `
                    <div class="carousel-item ${index === 0 ? 'active' : ''}">
                        <img src="${url}${encodeURI(image.image_path)}" class="d-block w-100" alt="Product image ${index + 1}">
                    </div>
                `).join('');
                const carouselHtml = images.length ? `
                    <div id="${carouselId}" class="carousel slide mb-3" data-ride="carousel">
                      <ol class="carousel-indicators">
                        ${carouselIndicators}
                      </ol>
                      <div class="carousel-inner">
                        ${carouselItems}
                      </div>
                      <a class="carousel-control-prev" href="#${carouselId}" role="button" data-slide="prev">
                        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                        <span class="sr-only">Previous</span>
                      </a>
                      <a class="carousel-control-next" href="#${carouselId}" role="button" data-slide="next">
                        <span class="carousel-control-next-icon" aria-hidden="true"></span>
                        <span class="sr-only">Next</span>
                      </a>
                    </div>
                ` : `<img src="https://via.placeholder.com/400x250?text=No+Image" class="img-fluid mb-3" style="max-height:200px;">`;

                $('#productDetailsModalLabel').text(description);
                $('#productDetailsModalBody').html(`
                        ${carouselHtml}
                        <p id="price">Price: ₱<strong>${price}</strong></p>
                        <p>Stock: ${stock}</p>
                        <input type="number" class="form-control mb-3" id="detailsQty" min="1" max="${stock}" value="1">
                        <input type="hidden" id="detailsItemId" value="${id}">
                        <button type="button" class="btn btn-primary" id="detailsAddToCart">Add to Cart</button>
                    `);

                // Show modal
                $('#productDetailsModal').modal('show');
            })

            // Card-level carousel prev/next handlers
            $(document).on('click', '.carousel-prev, .carousel-next', function (e) {
                e.preventDefault();
                const isPrev = $(this).hasClass('carousel-prev');
                const card = $(this).closest('.card-carousel');
                if (!card || !card.length) return;
                let images = [];
                const imagesAttr = card.attr('data-images');
                if (imagesAttr) {
                    try {
                        images = JSON.parse(imagesAttr);
                    } catch (err) {
                        images = card.data('images') || [];
                    }
                } else {
                    images = card.data('images') || [];
                }
                if (!images || !images.length) return;
                let idx = parseInt(card.attr('data-index') || '0', 10);
                idx = isPrev ? (idx - 1 + images.length) % images.length : (idx + 1) % images.length;
                card.attr('data-index', idx);
                const img = card.find('img.card-img-top').first();
                const imgPath = images[idx] && images[idx].image_path ? `${url}${encodeURI(images[idx].image_path)}` : 'https://via.placeholder.com/400x250?text=No+Image';
                img.attr('src', imgPath);
            });

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
