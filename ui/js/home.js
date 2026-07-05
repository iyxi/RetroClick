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

    const normalizeImageList = (value) => {
      const images = Array.isArray(value?.ItemImages) ? value.ItemImages.slice() : [];
      if (!images.length && value?.img_path) {
        images.push({ image_path: value.img_path, is_primary: true, sort_order: 0 });
      }
      return images.slice().sort((a, b) => {
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

      return `
        <div class="col-12 col-md-6 col-lg-4 mb-4">
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
              <div class="product-actions">
                <button type="button" class="btn btn-primary btn-cart add-to-cart-card"
                  data-id="${value.item_id}"
                  data-description="${escapeHtml(value.description)}"
                  data-price="${value.sell_price}"
                  data-stock="${stockQty}"
                  data-primary="${primaryImage || ''}">
                  ${cartButtonLabel}
                </button>
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

  const addToCartFromCard = function (button) {
        if (!requireLogin()) {
            return;
        }

    const id = parseInt(button.data('id'), 10);
    const description = String(button.data('description') || '').trim();
    const price = parseFloat(button.data('price')) || 0;
    const stock = parseInt(button.data('stock'), 10) || 0;
    const image = button.data('primary') ? `${url}${encodeURI(button.data('primary'))}` : 'https://via.placeholder.com/400x250?text=No+Image';

    if (stock <= 0) {
      Swal.fire('Out of Stock', 'This item is not available', 'warning');
            return;
        }

        let cart = getCart();

        let existing = cart.find(item => item.item_id == id);
        if (existing) {
      existing.quantity += 1;
        } else {
            cart.push({
                item_id: id,
                description: description,
        price: price,
                image: image,
                stock: stock,
        quantity: 1
            });
        }
        saveCart(cart);

        itemCount++;
        $('#itemCount').text(itemCount).css('display', 'block');
        Swal.fire('Added to Cart', `${description} was added to your cart.`, 'success');
  };

  $(document).on('click', '.add-to-cart-card', function () {
    addToCartFromCard($(this));
  });

    loadSharedHeader();

})
