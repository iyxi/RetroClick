$(document).ready(function () {
    const url = 'http://localhost:3000/'
    var itemCount = 0;
    var priceTotal = 0;
    var quantity = 0;
    let shopItems = [];
    let filteredItems = [];
    let currentPage = 1;
    let loadedPage = 1;
    let displayMode = 'pagination';
    let currentSortMode = 'default';
    let searchAutocompleteAttached = false;

    const ITEMS_PER_PAGE = 9;
    const normalizeText = (value) => String(value || '').trim().toLowerCase();
    const escapeHtml = (value) => String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const normalizeImagePath = (value) => {
      if (!value) return value;
      let normalized = String(value).replace(/\\/g, '/').trim();
      const imagesIndex = normalized.toLowerCase().indexOf('images/');
      if (imagesIndex !== -1) {
        normalized = normalized.slice(imagesIndex);
      } else {
        normalized = normalized.replace(/^[A-Za-z]:\//, '').replace(/^\/+/, '');
      }
      return normalized;
    };

    const renderStars = (avg) => {
      const full = Math.round(avg || 0);
      let stars = '';
      for (let i = 1; i <= 5; i += 1) {
        stars += i <= full ? '<i class="fas fa-star" style="color:#f5b301"></i>' : '<i class="far fa-star" style="color:#ccc"></i>';
      }
      return stars;
    };

    const normalizeImageList = (value) => {
      const images = Array.isArray(value?.ItemImages) ? value.ItemImages.slice() : [];
      const primaryImagePath = value?.img_path ? normalizeImagePath(value.img_path) : null;
      const normalizedImages = images.map((image) => ({
        ...image,
        image_path: normalizeImagePath(image?.image_path)
      }));

      const orderedImages = [];
      const seenPaths = new Set();

      if (primaryImagePath) {
        seenPaths.add(primaryImagePath);
        orderedImages.push({ image_path: primaryImagePath, is_primary: true, sort_order: -1 });
      }

      normalizedImages.forEach((image) => {
        if (!image || !image.image_path) return;
        if (seenPaths.has(image.image_path)) return;
        seenPaths.add(image.image_path);
        orderedImages.push(image);
      });

      return orderedImages.slice().sort((a, b) => {
        const orderA = Number.isFinite(a?.sort_order) ? a.sort_order : 0;
        const orderB = Number.isFinite(b?.sort_order) ? b.sort_order : 0;
        if (orderA !== orderB) return orderA - orderB;
        const primaryA = a?.is_primary ? 0 : 1;
        const primaryB = b?.is_primary ? 0 : 1;
        if (primaryA !== primaryB) return primaryA - primaryB;
        return (a?.image_id || 0) - (b?.image_id || 0);
      });
    };

    const parseImagesDataAttr = (element) => {
      if (!element || !element.length) return [];
      const imagesAttr = element.attr('data-images');
      if (!imagesAttr) {
        const dataImages = element.data('images');
        return Array.isArray(dataImages) ? dataImages : [];
      }
      try {
        return JSON.parse(decodeURIComponent(imagesAttr));
      } catch (err) {
        const fallback = element.data('images');
        return Array.isArray(fallback) ? fallback : [];
      }
    };

    const renderItemCard = (value) => {
      const stockQty = value.quantity ?? 0;
      const imagesList = normalizeImageList(value);
      const primaryImage = imagesList.length ? imagesList[0].image_path : null;
      const imagePath = primaryImage ? `${url}${encodeURI(primaryImage)}` : 'https://via.placeholder.com/400x250?text=No+Image';
      const imagesAttrEscaped = encodeURIComponent(JSON.stringify(imagesList));
      const cartButtonLabel = stockQty > 0 ? 'Add to Cart' : 'Out of Stock';
      const reviewCount = Array.isArray(value.Reviews) ? value.Reviews.length : 0;
      const avgRating = reviewCount ? value.Reviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0) / reviewCount : 0;

      return `
        <div class="col-12 col-md-6 col-lg-6 mb-4">
          <article class="product-card card-carousel" data-item-id="${value.item_id}" data-images='${imagesAttrEscaped}' data-index="0">
            <div class="product-image">
              <button type="button" class="nav-arrow left carousel-prev" aria-label="Previous image">‹</button>
              <img src="${imagePath}" alt="${escapeHtml(value.camera_model || value.description)}" />
              <button type="button" class="nav-arrow right carousel-next" aria-label="Next image">›</button>
            </div>
            <div class="product-body">
              <div class="product-brand">${escapeHtml(value.camera_brand || 'Vintage')}</div>
              <div class="product-description">${escapeHtml(value.description || '')}</div>
              <div class="product-title">${escapeHtml(value.camera_model || '')}</div>
              <div class="product-tags">
                <span class="product-condition">${escapeHtml(value.condition || 'Unknown')}</span>
                <span class="product-stock">Stock: ${stockQty}</span>
              </div>
              <div class="product-price">₱ ${parseFloat(value.sell_price).toFixed(2)}</div>
              <div class="product-rating" style="margin-top:0.5rem">${renderStars(avgRating)} <small>(${reviewCount})</small></div>
              <div class="product-actions">
                <button type="button" class="btn btn-primary btn-cart add-to-cart-card"
                  data-id="${value.item_id}"
                  data-description="${escapeHtml(value.description)}"
                  data-price="${value.sell_price}"
                  data-stock="${stockQty}"
                  data-primary="${primaryImage || ''}">
                  ${cartButtonLabel}
                </button>
                <button type="button" class="btn btn-sm btn-outline-secondary view-reviews-btn" data-id="${value.item_id}">View Reviews</button>
              </div>
            </div>
          </article>
        </div>`;
    };

    const getActiveFilters = () => {
      const query = String($('#shopSearchInput').val() || '').trim().toLowerCase();
      const activeConditions = $('.filter-condition:checked').map(function () { return this.value; }).get();
      const activeBrands = $('.filter-brand:checked').map(function () { return this.value; }).get();
      const maxPrice = parseFloat($('#priceRange').val()) || Infinity;
      const stockOnly = $('#inStockOnly').is(':checked');
      return { query, activeConditions, activeBrands, maxPrice, stockOnly };
    };

    const sortItemsInMemory = (items, mode) => {
      if (mode === 'default') return items.slice();
      return items.slice().sort(function (a, b) {
        const priceA = parseFloat(a.sell_price) || 0;
        const priceB = parseFloat(b.sell_price) || 0;
        const nameA = String(a.camera_model || a.description || '').trim();
        const nameB = String(b.camera_model || b.description || '').trim();

        if (mode === 'price-asc') return priceA - priceB;
        if (mode === 'price-desc') return priceB - priceA;
        if (mode === 'name-asc') return nameA.localeCompare(nameB);
        return 0;
      });
    };

    const getPageCount = () => Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));

    const updatePaginationControls = () => {
      const pageCount = getPageCount();
      const current = Math.min(currentPage, pageCount);
      const loaded = Math.min(loadedPage, pageCount);
      const navRoot = $('#paginationNav');
      const statusRoot = $('#paginationStatus');

      if (!navRoot.length) return;

      if (pageCount <= 1) {
        navRoot.empty();
      } else {
        const pageButtons = [];
        pageButtons.push(`<button type="button" class="page-button" data-page="${Math.max(1, current - 1)}" ${current <= 1 ? 'disabled' : ''} aria-label="Previous page">Prev</button>`);
        const visiblePages = Math.min(pageCount, 7);
        let startPage = 1;
        let endPage = pageCount;
        if (pageCount > visiblePages) {
          startPage = Math.max(1, current - 3);
          endPage = Math.min(pageCount, startPage + visiblePages - 1);
          if (endPage - startPage < visiblePages - 1) {
            startPage = Math.max(1, endPage - visiblePages + 1);
          }
        }
        if (startPage > 1) pageButtons.push('<span class="page-ellipsis">...</span>');
        for (let i = startPage; i <= endPage; i += 1) {
          pageButtons.push(`<button type="button" class="page-button ${i === current ? 'active' : ''}" data-page="${i}" aria-label="Page ${i}">${i}</button>`);
        }
        if (endPage < pageCount) pageButtons.push('<span class="page-ellipsis">...</span>');
        pageButtons.push(`<button type="button" class="page-button" data-page="${Math.min(pageCount, current + 1)}" ${current >= pageCount ? 'disabled' : ''} aria-label="Next page">Next</button>`);
        navRoot.html(pageButtons.join(''));
      }

      if (statusRoot.length) {
        const itemCountText = filteredItems.length === 1 ? 'item' : 'items';
        const visibleCount = displayMode === 'infinite' ? Math.min(filteredItems.length, loaded * ITEMS_PER_PAGE) : Math.min(filteredItems.length, ITEMS_PER_PAGE);
        statusRoot.text(`Showing ${visibleCount} of ${filteredItems.length} ${itemCountText} ${pageCount > 1 ? `— page ${current} of ${pageCount}` : ''}`);
      }
    };

    const renderCurrentPage = () => {
      const itemsRoot = $('#items');
      itemsRoot.empty();
      const pageCount = getPageCount();
      const page = Math.min(currentPage, pageCount);
      const endIndex = displayMode === 'infinite' ? Math.min(filteredItems.length, loadedPage * ITEMS_PER_PAGE) : page * ITEMS_PER_PAGE;
      const startIndex = displayMode === 'infinite' ? 0 : (page - 1) * ITEMS_PER_PAGE;
      const pageItems = filteredItems.slice(startIndex, endIndex);

      if (!pageItems.length) {
        $('#shopNoResults').show();
      } else {
        $('#shopNoResults').hide();
        pageItems.forEach(function (value) {
          itemsRoot.append(renderItemCard(value));
        });
      }

      if (!searchAutocompleteAttached) {
        attachShopSearchAutocomplete();
        searchAutocompleteAttached = true;
      }

      updatePaginationControls();
    };

    const applySortMode = (mode) => {
      currentSortMode = mode;
      filteredItems = sortItemsInMemory(filteredItems, mode);
    };

    window.shopApplyFilters = function () {
      const filters = getActiveFilters();
      filteredItems = shopItems.filter(function (value) {
        const haystack = `${String(value.camera_brand || '').toLowerCase()} ${String(value.camera_model || '').toLowerCase()} ${String(value.description || '').toLowerCase()} ${String(value.condition || '').toLowerCase()}`;
        let matches = !filters.query || haystack.indexOf(filters.query) !== -1;

        if (matches && filters.activeConditions.length) {
          matches = filters.activeConditions.indexOf(String(value.condition || '')) !== -1;
        }
        if (matches && filters.activeBrands.length) {
          matches = filters.activeBrands.indexOf(String(value.camera_brand || '')) !== -1;
        }
        if (matches && filters.maxPrice !== Infinity) {
          matches = parseFloat(value.sell_price) <= filters.maxPrice;
        }
        if (matches && filters.stockOnly) {
          const stockQty = parseInt(value.quantity || 0, 10);
          matches = stockQty > 0;
        }
        return matches;
      });

      currentPage = 1;
      loadedPage = 1;
      displayMode = 'pagination';
      applySortMode(currentSortMode);
      renderCurrentPage();
    };

    window.shopSortItems = function (mode) {
      applySortMode(mode);
      renderCurrentPage();
    };

    window.shopGoToPage = function (page) {
      const pageCount = getPageCount();
      currentPage = Math.min(Math.max(1, page), pageCount);
      loadedPage = Math.max(loadedPage, currentPage);
      displayMode = 'pagination';
      renderCurrentPage();
      window.scrollTo({ top: $('#items').offset().top - 120, behavior: 'smooth' });
    };

    window.shopLoadNextPage = function () {
      const pageCount = getPageCount();
      if (loadedPage >= pageCount) return;
      loadedPage += 1;
      displayMode = 'infinite';
      renderCurrentPage();
    };

    $(document).on('click', '#paginationNav .page-button', function () {
      const page = parseInt($(this).data('page'), 10);
      if (!Number.isNaN(page)) {
        window.shopGoToPage(page);
      }
    });

    const createInfiniteScrollObserver = () => {
      const sentinel = document.getElementById('scrollSentinel');
      if (!sentinel || typeof IntersectionObserver === 'undefined') return;
      const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            window.shopLoadNextPage();
          }
        });
      }, { rootMargin: '200px' });
      observer.observe(sentinel);
    };

    const initializePagination = () => {
      currentPage = 1;
      loadedPage = 1;
      displayMode = 'pagination';
      updatePaginationControls();
      createInfiniteScrollObserver();
    };

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

        // flags to control autofill behavior
        let _isDeletion = false;
        let _skipAutofill = false;

        searchInput.on('keydown', function (event) {
          // detect deletion keys
          _isDeletion = event.key === 'Backspace' || event.key === 'Delete';

          // Accept suggestion with ArrowRight or Tab
          if (event.key === 'ArrowRight' || event.key === 'Tab') {
            const selStart = this.selectionStart || 0;
            const val = this.value || '';
            // if there is a selection at the end, move caret to end (accept suggestion)
            if (this.selectionEnd && this.selectionEnd > selStart) {
              this.setSelectionRange(val.length, val.length);
              if (event.key === 'ArrowRight') event.preventDefault();
              _skipAutofill = true;
              return;
            }
          }
          if (event.key === 'Escape') {
            // clear selection by setting caret to end of typed substring
            const original = (this.getAttribute('data-original') || this.value) || '';
            try { this.setSelectionRange(original.length, original.length); } catch (e) {}
            clearSuggestions();
          }
        });

        searchInput.on('input', function () {
          const raw = this.value || '';
          renderSuggestions(raw);

          // Inline type-ahead: if top suggestion startsWith typed value, autofill and select appended text
          if (!_isDeletion && !_skipAutofill) {
            const suggestions = buildSearchSuggestions(raw);
            if (suggestions.length && raw.length > 0) {
              const top = suggestions[0].label || '';
              if (top.toLowerCase().startsWith(raw.toLowerCase()) && top.length > raw.length) {
                // set value to full suggestion and select appended portion
                this.value = top;
                try { this.setSelectionRange(raw.length, top.length); } catch (e) {}
              }
            }
          }

          // reset flags
          _isDeletion = false;
          _skipAutofill = false;
        });
  // store original typed text before blur so we can restore if needed
  searchInput.on('focus', function () { this.setAttribute('data-original', this.value || ''); });
  searchInput.on('blur', function () { this.removeAttribute('data-original'); setTimeout(clearSuggestions, 150); });

      suggestionsRoot.on('click', '.search-suggestion-item', function (ev) {
        ev.preventDefault();
        const value = $(this).data('value');
        _skipAutofill = true;
        // set the input value and focus it
        searchInput.val(value);
        try {
          const el = searchInput.get(0);
          el.focus();
          el.setSelectionRange(value.length, value.length);
        } catch (e) {}
        clearSuggestions();
        // small timeout to re-enable autofill for subsequent typing
        setTimeout(() => { _skipAutofill = false; }, 200);
        searchInput.trigger('input');
      });

      $(document).on('click', function (event) {
        if (!$(event.target).closest('.search-box').length) {
          clearSuggestions();
        }
      });
    };

    window.filterByBrand = function (brand) {
      const normalizedTarget = String(brand || '').trim().toLowerCase();
      document.querySelectorAll('.filter-brand').forEach(function (box) {
        const normalizedValue = String(box.value || '').trim().toLowerCase();
        box.checked = normalizedTarget && normalizedValue === normalizedTarget;
      });
      if (typeof window.shopApplyFilters === 'function') {
        window.shopApplyFilters();
      }
      if (typeof applyAllFilters === 'function') {
        applyAllFilters();
      }
    };
    window.filterProducts = window.filterByBrand;

      let cartCache = [];

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
        cartCache = Array.isArray(items) ? items.map((item) => ({
            ...item,
            selected: item.selected !== false
        })) : [];
    };

    const fetchCart = () => {
        const token = getStoredToken();
        if (!token) return Promise.resolve([]);

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
        setCartCache(cart);
        const token = getStoredToken();
        if (!token) return Promise.resolve(cart);

        const payload = {
            items: cart.map((item) => ({
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
            setCartCache(items);
            return items;
        }).catch((error) => {
            console.warn('Unable to save cart to server', error);
            return cart;
        });
    };

    const isLoggedIn = () => {
        return !!getStoredToken();
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

            // initialize in-memory filtered list and render the first page
            filteredItems = items.slice();
            initializePagination();
            renderCurrentPage();

            // Card-level carousel prev/next handlers
            $(document).on('click', '.carousel-prev, .carousel-next', function (e) {
                e.preventDefault();
                const isPrev = $(this).hasClass('carousel-prev');
                const card = $(this).closest('.product-card');
                if (!card || !card.length) return;
                const images = parseImagesDataAttr(card);
                if (!images || !images.length) return;
                let idx = parseInt(card.attr('data-index') || '0', 10);
                if (Number.isNaN(idx)) idx = 0;
                idx = isPrev ? (idx - 1 + images.length) % images.length : (idx + 1) % images.length;
                card.attr('data-index', idx);
                const img = card.find('.product-image img').first();
                const imgPath = images[idx]?.image_path ? `${url}${encodeURI(images[idx].image_path)}` : 'https://via.placeholder.com/400x250?text=No+Image';
                img.attr('src', imgPath);
            });

        },
        error: function (error) {
            console.log(error);

        }
    });

const showAddToCartModal = (payload) => {
        const image = payload.image || 'https://via.placeholder.com/120x90?text=No+Image';
        $('#cartModalImage').attr('src', image);
        $('#cartModalDesc').text(payload.description || 'Item');
        $('#cartModalPrice').text(`₱${parseFloat(payload.price || 0).toFixed(2)}`);
        $('#cartModalQty').val(1).attr('max', payload.stock || 1);
        $('#cartModalAlert').addClass('d-none').text('');
        $('#cartModalConfirm').off('click').on('click', async function () {
            const qty = Math.max(1, parseInt($('#cartModalQty').val() || 1, 10));
            const token = getStoredToken();
            if (!token) return;

            const cart = await fetchCart();
            const existing = cart.find(item => item.item_id == payload.item_id);
            if (existing) {
                existing.quantity = Number(existing.quantity || 0) + qty;
            } else {
                cart.push({
                    item_id: payload.item_id,
                    quantity: qty
                });
            }

            const updatedCart = await saveCart(cart);
            const updatedCount = updatedCart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
            itemCount = updatedCount;
            $('#itemCount').text(itemCount).css('display', itemCount > 0 ? 'block' : 'none');
            $('#cartModalAlert').removeClass('d-none').text(`${payload.description} was added to your cart.`);
            Swal.fire({
                icon: 'success',
                title: 'Added to cart successfully',
                showConfirmButton: false,
                timer: 1200,
                position: 'center'
            });
            setTimeout(() => $('#addToCartModal').modal('hide'), 1000);
        });
        $('#addToCartModal').modal('show');
    };

    const addToCartFromCard = async function (button) {
        if (!requireLogin()) {
            return;
        }

        const id = parseInt(button.data('id'), 10);
        const description = String(button.data('description') || '').trim();
        const stock = parseInt(button.data('stock'), 10) || 0;
        const image = String(button.data('primary') || '');
        const price = parseFloat(button.data('price')) || 0;

        if (stock <= 0) {
            Swal.fire('Out of Stock', 'This item is not available', 'warning');
            return;
        }

        showAddToCartModal({ item_id: id, description, price, image, stock });
    };

    $(document).on('click', '.add-to-cart-card', function () {
        addToCartFromCard($(this));
    });

    const requireCustomer = () => {
        if (!getStoredToken()) {
            return false;
        }
        return isCustomerUser();
    };

    const refreshCartCount = () => {
        if (!getStoredToken() || !isCustomerUser()) {
            itemCount = 0;
            $('#itemCount').text('0').css('display', 'none');
            return;
        }

        fetchCart().then((items) => {
            itemCount = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
            $('#itemCount').text(itemCount).css('display', itemCount > 0 ? 'block' : 'none');
        });
    };

    loadSharedHeader();
    refreshCartCount();

})
