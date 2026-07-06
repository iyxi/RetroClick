$(document).ready(function() {
    const url = 'http://localhost:3000/';
    
    // Get authentication token from session
    let token = sessionStorage.getItem('token');
    let userRole = sessionStorage.getItem('userRole');
    let userId = sessionStorage.getItem('userId');
    let userName = sessionStorage.getItem('userName');
    
    // Verify admin access
    const showAccessMessage = (message, redirectUrl) => {
        $('#adminAccessMessage').text(message).show();
        $('#adminShell').hide();
        if (redirectUrl) {
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 2200);
        }
    };

    if (!token || !userRole) {
        showAccessMessage('Access denied. Please login as an admin to continue.', 'login.html');
        return;
    }
    
    let role;
    try {
        role = JSON.parse(userRole);
    } catch (e) {
        console.error('Error parsing role:', e);
        showAccessMessage('Invalid login state. Please login again.', 'login.html');
        return;
    }

    if (role !== 'admin') {
        showAccessMessage('Only admin users may access this page.', 'profile.html');
        return;
    }

    $('#adminAccessMessage').hide();
    $('#adminShell').show();

    // Display admin info
    const displayAdminName = () => {
        const name = userName ? JSON.parse(userName) : 'Admin User';
        $('#adminName').html(`<span style="color: #2c3e50;"><i class="fas fa-user-shield"></i> ${name}</span>`);
    };

    // Helper function to get Authorization header
    const getAuthHeader = () => {
        return { 'Authorization': `Bearer ${JSON.parse(token)}` };
    };

    // Helper function to format error messages with detailed information
    const getDetailedErrorMessage = (error) => {
        let message = 'An unknown error occurred';
        let details = '';

        if (error.responseJSON) {
            message = error.responseJSON.error || error.responseJSON.message || message;
            details = error.responseJSON.details || '';
        } else if (error.statusText) {
            message = `${error.status} ${error.statusText}`;
            details = error.statusText === 'error' ? 'Network error or server is unreachable' : '';
        }

        // Format for display
        if (details) {
            return `${message}\n\nDetails: ${details}`;
        }
        return message;
    };

    // Initialize DataTables and sales charts
    let productsDataTable, ordersDataTable, usersDataTable, stockDataTable, salesDataTable;
    let salesMonthChart, salesBrandChart, salesTrendChart;

    // Product button delegation
    $('#productsTable').on('click', 'button.btn-edit', function(e) {
        e.preventDefault();
        showEditProductForm(this, $(this).data('id'));
    });

    $('#productsTable').on('click', 'button.btn-visibility', function(e) {
        e.preventDefault();
        const id = $(this).data('id');
        const visible = $(this).data('visible') === true || $(this).data('visible') === 'true' || $(this).data('visible') === 1 || $(this).data('visible') === '1';
        toggleProductVisibility(id, visible);
    });

    // Sidebar navigation
    $('.sidebar').on('click', '.nav-item', function() {
        const tabName = $(this).data('tab');
        if (!tabName) return;

        $('.tab-content').removeClass('active');
        $('#' + tabName).addClass('active');
        $('.sidebar .nav-item').removeClass('active');
        $(this).addClass('active');

        if (tabName === 'dashboard') {
            loadDashboard();
        } else if (tabName === 'products') {
            loadProducts();
        } else if (tabName === 'orders') {
            loadOrders();
        } else if (tabName === 'users') {
            loadUsers();
        } else if (tabName === 'stock') {
            loadStock();
        } else if (tabName === 'sales') {
            loadSalesOverview();
        }
    });

    // Load dashboard stats
    const loadDashboard = () => {
        $.ajax({
            method: 'GET',
            url: `${url}api/v1/items`,
            headers: getAuthHeader(),
            dataType: 'json',
            success: function(data) {
                $('#totalProducts').text(data.rows ? data.rows.length : 0);
            },
            error: function() {
                console.error('Failed to load products count');
                $('#totalProducts').text('0');
            }
        });

        $.ajax({
            method: 'GET',
            url: `${url}api/v1/orders`,
            headers: getAuthHeader(),
            dataType: 'json',
            success: function(data) {
                $('#totalOrders').text(data.rows ? data.rows.length : 0);
                loadRecentOrders(data.rows || []);
            },
            error: function() {
                console.error('Failed to load orders count');
                $('#totalOrders').text('0');
                $('#recentOrdersTable').html('<p class="text-center">No orders available</p>');
            }
        });

        $.ajax({
            method: 'GET',
            url: `${url}api/v1/users`,
            headers: getAuthHeader(),
            dataType: 'json',
            success: function(data) {
                $('#totalUsers').text(data.rows ? data.rows.length : 0);
            },
            error: function() {
                console.error('Failed to load users count');
                $('#totalUsers').text('0');
            }
        });
    };

    const loadRecentOrders = (orders) => {
        let total = 0;
        let html = '<table class="table table-sm"><thead><tr><th>Order ID</th><th>User</th><th>Date</th><th>Total</th></tr></thead><tbody>';
        orders.slice(0, 5).forEach(order => {
            const date = new Date(order.created_at).toLocaleDateString();
            const totalValue = parseFloat(order.total ?? order.total_amount ?? 0);
            total += totalValue;
            html += `<tr>
                <td>#${order.id}</td>
                <td>${order.User ? order.User.name : 'Unknown'}</td>
                <td>${date}</td>
                <td>₱${totalValue.toFixed(2)}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        $('#totalRevenue').text('₱' + total.toLocaleString('en-US', {minimumFractionDigits: 2}));
        $('#recentOrdersTable').html(html);
    };

    // Tab switching
    window.showTab = function(eventOrTabName, maybeTabName) {
        const event = maybeTabName ? eventOrTabName : null;
        const tabName = maybeTabName || eventOrTabName;

        $('.tab-content').removeClass('active');
        $('#' + tabName).addClass('active');
        $('.nav-item').removeClass('active');
        if (event && event.target) {
            const button = event.target.closest('button');
            if (button) button.classList.add('active');
        }

        if (tabName === 'dashboard') {
            loadDashboard();
        } else if (tabName === 'products') {
            loadProducts();
        } else if (tabName === 'orders') {
            loadOrders();
        } else if (tabName === 'users') {
            loadUsers();
        } else if (tabName === 'stock') {
            loadStock();
        } else if (tabName === 'sales') {
            loadSalesOverview();
        }
    };

    const destroySalesCharts = () => {
        if (salesMonthChart) {
            salesMonthChart.destroy();
            salesMonthChart = null;
        }
        if (salesBrandChart) {
            salesBrandChart.destroy();
            salesBrandChart = null;
        }
        if (salesTrendChart) {
            salesTrendChart.destroy();
            salesTrendChart = null;
        }
    };

    const buildChartColors = (count) => {
        const palette = [
            '#743014',
            '#c9a24b',
            '#84692b',
            '#4c6b3f',
            '#b35c2e',
            '#a43f2d',
            '#d6b36a',
            '#6b4d28'
        ];

        return Array.from({ length: count }, (_, index) => palette[index % palette.length]);
    };

    const formatPeso = (value) => `₱${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const renderSalesTable = (rows) => {
        if ($.fn.DataTable.isDataTable('#salesTable')) {
            salesDataTable.clear().destroy();
        }

        let html = '';
        if (rows.length) {
            rows.forEach(row => {
                const datePlaced = row.date_placed ? new Date(row.date_placed).toLocaleString() : '';
                html += `<tr>
                    <td>#${row.orderinfo_id}</td>
                    <td>#${row.orderline_id}</td>
                    <td>${row.item_id}</td>
                    <td>${row.camera_brand || ''}</td>
                    <td>${row.camera_model || ''}</td>
                    <td>${row.quantity || 0}</td>
                    <td>${formatPeso(row.unit_price)}</td>
                    <td>${formatPeso(row.line_total)}</td>
                    <td>${datePlaced}</td>
                    <td>${row.status || ''}</td>
                    <td>${row.payment_method || 'COD'}</td>
                </tr>`;
            });
        } else {
            html = '<tr><td colspan="11" class="text-center">No sales records found</td></tr>';
        }

        $('#salesTable tbody').html(html);

        salesDataTable = $('#salesTable').DataTable({
            pageLength: 10,
            order: [[0, 'desc']],
            language: {
                emptyTable: 'No sales records available'
            }
        });
    };

    const loadSalesOverview = function() {
        const salesOverviewUrl = `${url}api/v1/sales-overview`;

        $('#salesTable tbody').html('<tr><td colspan="11" class="text-center">Loading sales data...</td></tr>');

        $.ajax({
            method: 'GET',
            url: salesOverviewUrl,
            headers: getAuthHeader(),
            dataType: 'json',
            success: function(data) {
                const rows = data.rows || [];
                const monthlyRows = data.monthlyRows || [];
                const brandRows = data.brandRows || [];
                const topModelRows = data.topModelRows || [];
                const modelTrendRows = data.modelTrendRows || [];

                destroySalesCharts();
                renderSalesTable(rows);

                const monthLabels = monthlyRows.map(row => row.month_label);
                const monthValues = monthlyRows.map(row => Number(row.sold_total || 0));
                const monthColors = buildChartColors(monthValues.length);

                salesMonthChart = new Chart(document.getElementById('salesMonthChart'), {
                    type: 'bar',
                    data: {
                        labels: monthLabels,
                        datasets: [{
                            label: 'Units sold',
                            data: monthValues,
                            backgroundColor: monthColors,
                            borderColor: '#743014',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    precision: 0
                                }
                            }
                        }
                    }
                });

                const brandLabels = brandRows.map(row => row.camera_brand);
                const brandValues = brandRows.map(row => Number(row.sold_total || 0));

                salesBrandChart = new Chart(document.getElementById('salesBrandChart'), {
                    type: 'doughnut',
                    data: {
                        labels: brandLabels,
                        datasets: [{
                            label: 'Units sold by brand',
                            data: brandValues,
                            backgroundColor: buildChartColors(brandValues.length),
                            borderColor: '#f3e7d0',
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom'
                            }
                        }
                    }
                });

                const trendMonthIndex = monthlyRows.map(row => [row.month_key, row.month_label]);
                const trendLabels = trendMonthIndex.map(([, monthLabel]) => monthLabel);
                const trendMonthKeys = trendMonthIndex.map(([monthKey]) => monthKey);
                const topModels = data.topModels && data.topModels.length ? data.topModels : topModelRows.map(row => row.camera_model);
                const trendLookup = {};

                modelTrendRows.forEach(row => {
                    if (!trendLookup[row.camera_model]) {
                        trendLookup[row.camera_model] = {};
                    }
                    trendLookup[row.camera_model][row.month_key] = Number(row.sold_total || 0);
                });

                const trendColors = buildChartColors(topModels.length);
                const trendDatasets = topModels.map((model, index) => {
                    const color = trendColors[index];
                    return {
                        label: model,
                        data: trendMonthKeys.map(monthKey => {
                            return trendLookup[model]?.[monthKey] || 0;
                        }),
                        borderColor: color,
                        backgroundColor: color,
                        tension: 0.35,
                        fill: false,
                        spanGaps: true
                    };
                });

                salesTrendChart = new Chart(document.getElementById('salesTrendChart'), {
                    type: 'line',
                    data: {
                        labels: trendLabels,
                        datasets: trendDatasets
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom'
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    precision: 0
                                }
                            }
                        }
                    }
                });
            },
            error: function(error) {
                console.error('Load sales overview error:', error);
                destroySalesCharts();
                const errorMsg = getDetailedErrorMessage(error);
                $('#salesTable tbody').html('<tr><td colspan="11" class="text-center text-danger">Failed to load sales overview</td></tr>');
                Swal.fire('Error', errorMsg, 'error');
            }
        });
    };

    $('#refreshSalesOverviewBtn').on('click', function() {
        loadSalesOverview();
    });

    // PRODUCT MANAGEMENT
    window.showAddProductForm = function() {
        $('#productFormTitle').text('Add Product');
        $('#pForm')[0].reset();
        $('#productId').val('');
        $('#productForm').show();
        $('html, body').animate({scrollTop: $('#productForm').offset().top}, 'smooth');
    };

    window.showEditProductForm = function(el, id) {
        // support old signature showEditProductForm(id)
        if (typeof el === 'number' || (typeof el === 'string' && id === undefined)) {
            id = el;
            el = null;
        }

        $('#productFormTitle').text('Edit Product');
        $.ajax({
            method: 'GET',
            url: `${url}api/v1/items/${id}`,
            headers: getAuthHeader(),
            dataType: 'json',
            success: function(data) {
                if (data.result) {
                    $('#productId').val(data.result.item_id);
                    $('#pbrand').val(data.result.camera_brand);
                    $('#pmodel').val(data.result.camera_model);
                    $('#pdesc').val(data.result.description);
                    $('#pcondition').val(data.result.condition);
                    $('#pcost').val(data.result.cost_price);
                    $('#psell').val(data.result.sell_price);
                    $('#pqty').val(data.result.quantity || 0);
                    $('#pyear').val(data.result.year_released);
                    $('#productForm').show();
                    $('html, body').animate({scrollTop: $('#productForm').offset().top}, 'smooth');
                }
            },
            error: function(error) {
                console.error('Load product for edit error:', error);
                // fallback: if element is provided and contains data attributes, use them
                if (el) {
                    const $btn = $(el);
                    $('#productId').val(id);
                    $('#pbrand').val($btn.data('brand') || '');
                    $('#pmodel').val($btn.data('model') || '');
                    $('#pdesc').val($btn.data('desc') || '');
                    $('#pcondition').val($btn.data('condition') || 'Good');
                    $('#pcost').val($btn.data('cost') || '');
                    $('#psell').val($btn.data('sell') || '');
                    $('#pqty').val($btn.data('qty') || 0);
                    $('#pyear').val($btn.data('year') || '');
                    $('#productForm').show();
                    $('html, body').animate({scrollTop: $('#productForm').offset().top}, 'smooth');
                    return;
                }

                const errorMsg = getDetailedErrorMessage(error);
                Swal.fire('Error', errorMsg, 'error');
            }
        });
    };

    window.showProductForm = function(id) {
        showEditProductForm(id);
    };

    window.hideProductForm = function() {
        $('#productForm').hide();
        $('#pForm')[0].reset();
    };

    window.saveProduct = function() {
        const productId = $('#productId').val();
        const brand = $('#pbrand').val()?.trim();
        const model = $('#pmodel').val()?.trim();
        const desc = $('#pdesc').val()?.trim();
        const condition = $('#pcondition').val();
        const costPrice = $('#pcost').val();
        const sellPrice = $('#psell').val();
        const year = $('#pyear').val();
        const qty = $('#pqty').val();
        const imageFiles = $('#pimage')[0].files;

        // Validation
        if (!brand || !model || !desc || !sellPrice) {
            Swal.fire('Error', 'Please fill all required fields (Brand, Model, Description, Sell Price)', 'error');
            return;
        }

        if (parseFloat(sellPrice) <= 0) {
            Swal.fire('Error', 'Sell Price must be greater than 0', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('camera_brand', brand);
        formData.append('camera_model', model);
        formData.append('description', desc);
        formData.append('condition', condition || 'Good');
        formData.append('cost_price', costPrice || 0);
        formData.append('sell_price', sellPrice);
        formData.append('year_released', year || new Date().getFullYear());
        formData.append('quantity', qty || 0);
        if (imageFiles && imageFiles.length) {
            for (let i = 0; i < imageFiles.length; i++) {
                formData.append('images', imageFiles[i]);
            }
        }

        // Use POST for edits to ensure multipart/form-data reaches the server reliably
        const method = 'POST';
        const endpoint = productId ? `${url}api/v1/items/${productId}` : `${url}api/v1/items`;

        $.ajax({
            method: method,
            url: endpoint,
            headers: getAuthHeader(),
            data: formData,
            contentType: false,
            processData: false,
            dataType: 'json',
            success: function(data) {
                Swal.fire('Success', data.message || 'Product saved successfully', 'success').then(() => {
                    hideProductForm();
                    loadProducts();
                });
            },
            error: function(error) {
                console.error('Save product error:', error);
                const errorMsg = getDetailedErrorMessage(error);
                Swal.fire('Error', errorMsg, 'error');
            }
        });
    };

    const loadProducts = function() {
        $.ajax({
            method: 'GET',
            url: `${url}api/v1/items`,
            headers: getAuthHeader(),
            dataType: 'json',
            success: function(data) {
                // Destroy existing DataTable if it exists
                if ($.fn.DataTable.isDataTable('#productsTable')) {
                    productsDataTable.destroy();
                }

                let html = '';
                if (data.rows && data.rows.length > 0) {
                    data.rows.forEach(product => {
                        const stock = product.quantity || 0;
                        const visible = product.is_visible === true || product.is_visible === 1 || product.is_visible === '1';
                        const statusLabel = visible ? 'Active' : 'Archived';
                        const statusClass = visible ? 'badge-success' : 'badge-secondary';
                        const visibilityAction = visible ? 'Delete' : 'Delete';
                        const visibilityIcon = visible ? 'fa-trash' : 'fa-trash';

                        // embed product fields as data attributes so we can populate the edit form without an extra request if needed
                        const dataAttrs = `data-brand="${(product.camera_brand || '').replace(/\"/g, '&quot;')}" data-model="${(product.camera_model || '').replace(/\"/g, '&quot;')}" data-desc="${(product.description || '').replace(/\"/g, '&quot;')}" data-condition="${(product.condition || '')}" data-cost="${product.cost_price || 0}" data-sell="${product.sell_price || 0}" data-qty="${stock}" data-year="${product.year_released || ''}"`;

                        html += `<tr>
                            <td>${product.item_id}</td>
                            <td>${product.camera_brand}</td>
                            <td>${product.camera_model}</td>
                            <td>${product.description}</td>
                            <td>₱${parseFloat(product.sell_price).toFixed(2)}</td>
                            <td>${product.condition || 'Good'}</td>
                            <td>${stock}</td>
                            <td><span class="badge ${statusClass}">${statusLabel}</span></td>
                            <td>
                                <button class="btn btn-sm btn-info btn-action btn-edit" ${dataAttrs} data-id="${product.item_id}" data-visible="${visible}" title="Edit"><i class="fas fa-edit"></i></button>
                                <button class="btn btn-sm btn-danger btn-action btn-visibility" data-id="${product.item_id}" data-visible="${visible}" title="${visibilityAction}"><i class="fas ${visibilityIcon}"></i></button>
                            </td>
                        </tr>`;
                    });
                } else {
                    html = '<tr><td colspan="9" class="text-center">No products found</td></tr>';
                }
                $('#productsTable tbody').html(html);

                // Initialize DataTable
                productsDataTable = $('#productsTable').DataTable({
                    "pageLength": 10,
                    "order": [[0, 'desc']],
                    "language": {
                        "emptyTable": "No products available"
                    }
                });

            },
            error: function(error) {
                console.error('Load products error:', error);
                const errorMsg = getDetailedErrorMessage(error);
                Swal.fire('Error', errorMsg, 'error');
                $('#productsTable tbody').html('<tr><td colspan="9" class="text-center text-danger">Failed to load products</td></tr>');
            }
        });
    };

    window.toggleProductVisibility = function(id, visible) {
        const shouldArchive = visible === true || visible === 'true' || visible === 1 || visible === '1';
        const action = shouldArchive ? 'archive' : 'restore';
        const title = shouldArchive ? 'Delete Product?' : 'Restore Product?';
        const text = shouldArchive ? 'This product will be permanently deleted. This action cannot be undone.' : 'This product will become visible again.';

        Swal.fire({
            title,
            text,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: shouldArchive ? 'Yes, Delete' : 'Yes, Restore',
            cancelButtonText: 'Cancel',
            allowOutsideClick: false
        }).then(result => {
            if (result.isConfirmed) {
                $.ajax({
                    method: 'PUT',
                    url: `${url}api/v1/items/${id}/${action}`,
                    headers: getAuthHeader(),
                    dataType: 'json',
                    success: function(data) {
                        Swal.fire('Success', data.message || `Product ${action}d successfully`, 'success').then(() => {
                            loadProducts();
                        });
                    },
                    error: function(error) {
                        console.error(`${action} product error:`, error);
                        const errorMsg = getDetailedErrorMessage(error);
                        Swal.fire('Error', errorMsg, 'error');
                    }
                });
            }
        });
    };

    // ORDER MANAGEMENT
    const loadOrders = function() {
        $.ajax({
            method: 'GET',
            url: `${url}api/v1/orders`,
            headers: getAuthHeader(),
            dataType: 'json',
            success: function(data) {
                // Destroy existing DataTable if it exists
                if ($.fn.DataTable.isDataTable('#ordersTable')) {
                    ordersDataTable.clear().destroy();
                }

                const rows = data.rows || [];
                ordersDataTable = $('#ordersTable').DataTable({
                    data: rows,
                    pageLength: 10,
                    order: [[0, 'desc']],
                    language: {
                        emptyTable: 'No orders available'
                    },
                    columns: [
                        {
                            data: 'id',
                            render: function(data) {
                                return `#${data}`;
                            }
                        },
                        {
                            data: 'User',
                            render: function(data) {
                                return data && data.name ? data.name : 'Unknown';
                            }
                        },
                        {
                            data: 'created_at',
                            render: function(data) {
                                return data ? new Date(data).toLocaleDateString() : '';
                            }
                        },
                        {
                            data: 'status',
                            render: function(data) {
                                const normalizedStatus = String(data || '').toLowerCase();
                                const statusBadge = normalizedStatus === 'completed' ? 'badge-success' :
                                                  normalizedStatus === 'pending' ? 'badge-warning' :
                                                  normalizedStatus === 'processing' ? 'badge-info' : 'badge-danger';
                                return `<span class="badge ${statusBadge}">${data || ''}</span>`;
                            }
                        },
                        {
                            data: 'total',
                            render: function(data) {
                                return `₱${parseFloat(data || 0).toFixed(2)}`;
                            }
                        },
                        {
                            data: 'payment_method',
                            render: function(data) {
                                return data || 'COD';
                            }
                        },
                        {
                            data: null,
                            orderable: false,
                            searchable: false,
                            render: function(data, type, row) {
                                return `
                                    <button class="btn btn-sm btn-info btn-action" onclick="editOrderStatus(${row.id}, '${row.status}')" title="Edit Status"><i class="fas fa-edit"></i></button>
                                    <button class="btn btn-sm btn-danger btn-action" onclick="deleteOrder(${row.id})" title="Delete"><i class="fas fa-trash"></i></button>
                                `;
                            }
                        }
                    ]
                });
            },
            error: function(error) {
                console.error('Load orders error:', error);
                if ($.fn.DataTable.isDataTable('#ordersTable')) {
                    ordersDataTable.clear().destroy();
                }
                $('#ordersTable tbody').html('<tr><td colspan="7" class="text-center text-danger">Failed to load orders</td></tr>');
            }
        });
    };

    window.editOrderStatus = function(id, currentStatus) {
        const currentValue = String(currentStatus || '').toLowerCase();
        const currentStatusLabel = {
            pending: 'Pending',
            processing: 'Processing',
            completed: 'Completed'
        }[currentValue] || 'Pending';
        let selectedStatus = currentStatusLabel;
        Swal.fire({
            title: 'Update Order Status',
            html: `
                <div class="order-status-picker">
                    <button type="button" class="order-status-option ${currentStatusLabel === 'Pending' ? 'is-active' : ''}" data-status="Pending">Pending</button>
                    <button type="button" class="order-status-option ${currentStatusLabel === 'Processing' ? 'is-active' : ''}" data-status="Processing">Processing</button>
                    <button type="button" class="order-status-option ${currentStatusLabel === 'Completed' ? 'is-active' : ''}" data-status="Completed">Completed</button>
                </div>
            `,
            width: 360,
            customClass: {
                popup: 'order-status-swal'
            },
            didOpen: () => {
                const popup = Swal.getPopup();
                popup.querySelectorAll('.order-status-option').forEach(button => {
                    button.addEventListener('click', () => {
                        selectedStatus = button.getAttribute('data-status') || 'Pending';
                        popup.querySelectorAll('.order-status-option').forEach(option => option.classList.remove('is-active'));
                        button.classList.add('is-active');
                    });
                });
            },
            preConfirm: () => selectedStatus,
            showConfirmButton: true,
            showDenyButton: false,
            showCancelButton: true,
            confirmButtonText: 'Update',
            allowOutsideClick: false
        }).then(result => {
            if (result.isConfirmed && result.value) {
                $.ajax({
                    method: 'PUT',
                    url: `${url}api/v1/orders/${id}`,
                    headers: getAuthHeader(),
                    data: JSON.stringify({status: result.value}),
                    contentType: 'application/json',
                    dataType: 'json',
                    success: function() {
                        Swal.fire('Success!', 'Order status updated to: ' + result.value, 'success').then(() => {
                            loadOrders();
                        });
                    },
                    error: function(error) {
                        console.error('Update order error:', error);
                        const errorMsg = getDetailedErrorMessage(error);
                        Swal.fire('Error', errorMsg, 'error');
                    }
                });
            }
        });
    };

    window.deleteOrder = function(id) {
        Swal.fire({
            title: 'Delete Order?',
            text: 'This action cannot be undone',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Delete',
            cancelButtonText: 'Cancel',
            allowOutsideClick: false
        }).then(result => {
            if (result.isConfirmed) {
                $.ajax({
                    method: 'DELETE',
                    url: `${url}api/v1/orders/${id}`,
                    headers: getAuthHeader(),
                    dataType: 'json',
                    success: function() {
                        Swal.fire('Deleted!', 'Order deleted successfully', 'success').then(() => {
                            loadOrders();
                        });
                    },
                    error: function(error) {
                        console.error('Delete order error:', error);
                        const errorMsg = getDetailedErrorMessage(error);
                        Swal.fire('Error', errorMsg, 'error');
                    }
                });
            }
        });
    };

    // USER MANAGEMENT
    const getCurrentAdminId = () => {
        try {
            return JSON.parse(userId);
        } catch (error) {
            return userId;
        }
    };

    const loadUsers = function() {
        $.ajax({
            method: 'GET',
            url: `${url}api/v1/users`,
            headers: getAuthHeader(),
            dataType: 'json',
            success: function(data) {
                // Destroy existing DataTable if it exists
                if ($.fn.DataTable.isDataTable('#usersTable')) {
                    usersDataTable.destroy();
                }

                let html = '';
                if (data.rows && data.rows.length > 0) {
                    data.rows.forEach(user => {
                        const lastLogin = user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never';
                        const statusBadge = user.is_active ? 'badge-success' : 'badge-danger';
                        const buttonText = user.is_active ? '<i class="fas fa-ban"></i>' : '<i class="fas fa-check"></i>';
                        const buttonClass = user.is_active ? 'btn-danger' : 'btn-success';
                        const isCurrentAdmin = String(user.id) === String(getCurrentAdminId());
                        const userNameArg = String(user.name || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                        
                        html += `<tr>
                            <td>${user.id}</td>
                            <td>${user.name}</td>
                            <td>${user.email}</td>
                            <td><span class="badge badge-info">${user.role}</span></td>
                            <td><span class="badge ${statusBadge}">${user.is_active ? 'Active' : 'Inactive'}</span></td>
                            <td>${lastLogin}</td>
                            <td>
                                <button class="btn btn-sm btn-warning btn-action" onclick="changeUserRole(${user.id}, '${user.role}')" title="Change Role"><i class="fas fa-key"></i></button>
                                <button class="btn btn-sm ${buttonClass} btn-action" onclick="toggleUserStatus(${user.id}, ${user.is_active})" title="${user.is_active ? 'Deactivate' : 'Activate'}">${buttonText}</button>
                                <button class="btn btn-sm btn-dark btn-action" onclick="deleteUserAccount(${user.id}, '${userNameArg}')" title="Delete Account" ${isCurrentAdmin ? 'disabled' : ''}><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>`;
                    });
                } else {
                    html = '<tr><td colspan="7" class="text-center">No users found</td></tr>';
                }
                $('#usersTable tbody').html(html);

                // Initialize DataTable
                usersDataTable = $('#usersTable').DataTable({
                    "pageLength": 10,
                    "order": [[0, 'desc']],
                    "language": {
                        "emptyTable": "No users available"
                    }
                });
            },
            error: function(error) {
                console.error('Load users error:', error);
                $('#usersTable tbody').html('<tr><td colspan="7" class="text-center text-danger">Failed to load users</td></tr>');
            }
        });
    };

    window.changeUserRole = function(userId, currentRole) {
        Swal.fire({
            title: 'Change User Role',
            input: 'select',
            inputOptions: {
                'customer': 'Customer',
                'admin': 'Admin'
            },
            inputValue: currentRole,
            showCancelButton: true,
            confirmButtonText: 'Update',
            allowOutsideClick: false
        }).then(result => {
            if (result.isConfirmed && result.value) {
                $.ajax({
                    method: 'PUT',
                    url: `${url}api/v1/users/${userId}/role`,
                    headers: getAuthHeader(),
                    data: JSON.stringify({role: result.value}),
                    contentType: 'application/json',
                    dataType: 'json',
                    success: function() {
                        Swal.fire('Success!', 'User role updated to: ' + result.value, 'success').then(() => {
                            loadUsers();
                        });
                    },
                    error: function(error) {
                        console.error('Update role error:', error);
                        const errorMsg = getDetailedErrorMessage(error);
                        Swal.fire('Error', errorMsg, 'error');
                    }
                });
            }
        });
    };

    window.toggleUserStatus = function(userId, isActive) {
        const action = isActive ? 'deactivate' : 'activate';
        const endpoint = isActive ? 'deactivate' : 'activate';

        Swal.fire({
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} User?`,
            text: `Are you sure you want to ${action} this user?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes',
            cancelButtonText: 'Cancel',
            allowOutsideClick: false
        }).then(result => {
            if (result.isConfirmed) {
                $.ajax({
                    method: 'PUT',
                    url: `${url}api/v1/users/${userId}/${endpoint}`,
                    headers: getAuthHeader(),
                    contentType: 'application/json',
                    dataType: 'json',
                    success: function() {
                        Swal.fire('Success!', `User ${action}d successfully`, 'success').then(() => {
                            loadUsers();
                        });
                    },
                    error: function(error) {
                        console.error('Toggle user status error:', error);
                        const errorMsg = getDetailedErrorMessage(error);
                        Swal.fire('Error', errorMsg, 'error');
                    }
                });
            }
        });
    };

    window.deleteUserAccount = function(userId, userName) {
        const currentAdminId = getCurrentAdminId();
        if (String(userId) === String(currentAdminId)) {
            Swal.fire('Error', 'You cannot delete your own account from the admin panel.', 'error');
            return;
        }

        Swal.fire({
            title: 'Delete User?',
            text: `Permanently remove ${userName || 'this user'}? This cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Delete',
            cancelButtonText: 'Cancel',
            allowOutsideClick: false
        }).then(result => {
            if (result.isConfirmed) {
                $.ajax({
                    method: 'DELETE',
                    url: `${url}api/v1/users/${userId}`,
                    headers: getAuthHeader(),
                    dataType: 'json',
                    success: function() {
                        Swal.fire('Deleted!', 'User account deleted successfully', 'success').then(() => {
                            loadUsers();
                        });
                    },
                    error: function(error) {
                        console.error('Delete user error:', error);
                        const errorMsg = getDetailedErrorMessage(error);
                        Swal.fire('Error', errorMsg, 'error');
                    }
                });
            }
        });
    };

    // STOCK MANAGEMENT
    const loadStock = function() {
        $.ajax({
            method: 'GET',
            url: `${url}api/v1/items`,
            headers: getAuthHeader(),
            dataType: 'json',
            success: function(data) {
                // Destroy existing DataTable if it exists
                if ($.fn.DataTable.isDataTable('#stockTable')) {
                    stockDataTable.destroy();
                }

                let html = '';
                if (data.rows && data.rows.length > 0) {
                    data.rows.forEach(item => {
                        const quantity = item.quantity || 0;
                        const threshold = item.low_stock_threshold || 5;
                        let statusBadge = quantity > threshold ? 'badge-success' : 'badge-warning';
                        if (quantity === 0) statusBadge = 'badge-danger';

                        html += `<tr>
                            <td>${item.camera_brand} ${item.camera_model}</td>
                            <td><span class="badge badge-primary">${quantity}</span></td>
                            <td>${threshold}</td>
                            <td><span class="badge ${statusBadge}">${quantity === 0 ? 'Out of Stock' : quantity <= threshold ? 'Low Stock' : 'In Stock'}</span></td>
                            <td>
                                <button class="btn btn-sm btn-primary btn-action" onclick="updateStockQty(${item.item_id})" title="Add Stock"><i class="fas fa-plus"></i></button>
                            </td>
                        </tr>`;
                    });
                } else {
                    html = '<tr><td colspan="5" class="text-center">No items found</td></tr>';
                }
                $('#stockTable tbody').html(html);

                // Initialize DataTable
                stockDataTable = $('#stockTable').DataTable({
                    "pageLength": 10,
                    "language": {
                        "emptyTable": "No items available"
                    }
                });
            },
            error: function(error) {
                console.error('Load stock error:', error);
                $('#stockTable tbody').html('<tr><td colspan="5" class="text-center text-danger">Failed to load stock</td></tr>');
            }
        });
    };

    window.updateStockQty = function(itemId) {
        Swal.fire({
            title: 'Add Stock',
            input: 'number',
            inputLabel: 'Quantity to add',
            inputPlaceholder: 'Enter quantity',
            inputAttributes: {
                min: 1
            },
            showCancelButton: true,
            confirmButtonText: 'Add',
            allowOutsideClick: false,
            didOpen: () => {
                const inputElement = Swal.getInput();
                inputElement.focus();
            }
        }).then(result => {
            if (result.isConfirmed && result.value && result.value > 0) {
                // Get current stock
                $.ajax({
                    method: 'GET',
                    url: `${url}api/v1/items/${itemId}`,
                    headers: getAuthHeader(),
                    dataType: 'json',
                    success: function(data) {
                        if (data.result) {
                            const currentQty = data.result.quantity || 0;
                            const addQty = parseInt(result.value);
                            const newQty = parseInt(currentQty) + addQty;

                            // Update stock
                            $.ajax({
                                method: 'PUT',
                                url: `${url}api/v1/items/${itemId}`,
                                headers: getAuthHeader(),
                                data: JSON.stringify({
                                    camera_brand: data.result.camera_brand,
                                    camera_model: data.result.camera_model,
                                    description: data.result.description,
                                    condition: data.result.condition,
                                    cost_price: data.result.cost_price,
                                    sell_price: data.result.sell_price,
                                    quantity: newQty
                                }),
                                contentType: 'application/json',
                                dataType: 'json',
                                success: function() {
                                    Swal.fire('Success', `Added ${addQty} units. New stock: ${newQty}`, 'success').then(() => {
                                        loadStock();
                                    });
                                },
                                error: function(error) {
                                    console.error('Update stock error:', error);
                                    const errorMsg = getDetailedErrorMessage(error);
                                    Swal.fire('Error', errorMsg, 'error');
                                }
                            });
                        }
                    },
                    error: function(error) {
                        console.error('Get item error:', error);
                        const errorMsg = getDetailedErrorMessage(error);
                        Swal.fire('Error', errorMsg, 'error');
                    }
                });
            }
        });
    };

    // LOGOUT
    window.logout = function() {
        Swal.fire({
            title: 'Logout?',
            text: 'Are you sure you want to logout?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Logout',
            cancelButtonText: 'Cancel',
            allowOutsideClick: false
        }).then(result => {
            if (result.isConfirmed) {
                sessionStorage.clear();
                window.location.href = 'login.html';
            }
        });
    };

    // Initialize
    displayAdminName();
    loadDashboard();
});
