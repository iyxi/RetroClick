$(document).ready(function() {
    const url = 'http://localhost:3000/';
    
    // Get authentication token from session
    const token = sessionStorage.getItem('token');
    const userRole = sessionStorage.getItem('userRole');
    const userId = sessionStorage.getItem('userId');
    const userName = sessionStorage.getItem('userName');
    
    // Verify admin access
    if (!token || !userRole) {
        window.location.href = 'login.html';
        return;
    }
    
    const role = JSON.parse(userRole);
    if (role !== 'admin' && role !== 'manager') {
        window.location.href = 'profile.html';
        return;
    }

    // Display admin info
    const displayAdminName = () => {
        const name = userName ? JSON.parse(userName) : 'Admin User';
        $('#adminName').html(`<span style="color: #2c3e50;"><i class="fas fa-user-shield"></i> ${name}</span>`);
    };

    // Helper function to get Authorization header
    const getAuthHeader = () => {
        return { 'Authorization': `Bearer ${JSON.parse(token)}` };
    };

    // Initialize DataTables
    let productsDataTable, ordersDataTable, usersDataTable, stockDataTable;

    // Load dashboard stats
    const loadDashboard = () => {
        $.ajax({
            method: 'GET',
            url: `${url}api/v1/items`,
            headers: getAuthHeader(),
            dataType: 'json',
            success: function(data) {
                $('#totalProducts').text(data.rows ? data.rows.length : 0);
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
                $('#totalOrders').text('0');
            }
        });

        $.ajax({
            method: 'GET',
            url: `${url}api/v1/users`,
            headers: getAuthHeader(),
            dataType: 'json',
            success: function(data) {
                $('#totalUsers').text(data.rows ? data.rows.length : 0);
            }
        });
    };

    const loadRecentOrders = (orders) => {
        let total = 0;
        let html = '<table class="table table-sm"><thead><tr><th>Order ID</th><th>User</th><th>Date</th><th>Total</th></tr></thead><tbody>';
        orders.slice(0, 5).forEach(order => {
            const date = new Date(order.created_at).toLocaleDateString();
            total += parseFloat(order.total_amount || 0);
            html += `<tr>
                <td>#${order.id}</td>
                <td>${order.User ? order.User.name : 'Unknown'}</td>
                <td>${date}</td>
                <td>₱${parseFloat(order.total_amount || 0).toFixed(2)}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        $('#totalRevenue').text('₱' + total.toLocaleString('en-US', {minimumFractionDigits: 2}));
        $('#recentOrdersTable').html(html);
    };

    // Tab switching
    window.showTab = function(tabName) {
        $('.tab-content').removeClass('active');
        $('#' + tabName).addClass('active');
        $('.nav-item').removeClass('active');
        event.target.closest('button').classList.add('active');

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
        }
    };

    // PRODUCT MANAGEMENT
    window.showProductForm = function(id = null) {
        if (id) {
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
                        $('#pqty').val(data.result.Stock ? data.result.Stock.quantity : 0);
                        $('#pyear').val(data.result.year_released);
                        $('#productForm').show();
                        $('html, body').animate({scrollTop: $('#productForm').offset().top}, 'smooth');
                    }
                }
            });
        } else {
            $('#pForm')[0].reset();
            $('#productId').val('');
            $('#productForm').show();
            $('html, body').animate({scrollTop: $('#productForm').offset().top}, 'smooth');
        }
    };

    window.hideProductForm = function() {
        $('#productForm').hide();
        $('#pForm')[0].reset();
    };

    window.saveProduct = function() {
        const productId = $('#productId').val();
        const brand = $('#pbrand').val();
        const model = $('#pmodel').val();
        const desc = $('#pdesc').val();
        const condition = $('#pcondition').val();
        const costPrice = $('#pcost').val();
        const sellPrice = $('#psell').val();
        const year = $('#pyear').val();
        const qty = $('#pqty').val();
        const imageFile = $('#pimage')[0].files[0];

        if (!brand || !model || !desc || !sellPrice) {
            Swal.fire('Error', 'Please fill all required fields', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('camera_brand', brand);
        formData.append('camera_model', model);
        formData.append('description', desc);
        formData.append('condition', condition);
        formData.append('cost_price', costPrice);
        formData.append('sell_price', sellPrice);
        formData.append('year_released', year);
        formData.append('quantity', qty);
        if (imageFile) {
            formData.append('image', imageFile);
        }

        const method = productId ? 'PUT' : 'POST';
        const url_endpoint = productId ? `${url}api/v1/items/${productId}` : `${url}api/v1/items`;

        $.ajax({
            method: method,
            url: url_endpoint,
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
                Swal.fire('Error', error.responseJSON?.error || 'Failed to save product', 'error');
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
                if ($.fn.DataTable.isDataTable('#productsTable')) {
                    productsDataTable.destroy();
                }

                let html = '';
                if (data.rows) {
                    data.rows.forEach(product => {
                        const stock = product.Stock ? product.Stock.quantity : 0;
                        html += `<tr>
                            <td>${product.item_id}</td>
                            <td>${product.camera_brand}</td>
                            <td>${product.camera_model}</td>
                            <td>${product.description}</td>
                            <td>₱${parseFloat(product.sell_price).toFixed(2)}</td>
                            <td>${product.condition}</td>
                            <td>${stock}</td>
                            <td>
                                <button class="btn btn-sm btn-info btn-action" onclick="showProductForm(${product.item_id})"><i class="fas fa-edit"></i></button>
                                <button class="btn btn-sm btn-danger btn-action" onclick="deleteProduct(${product.item_id})"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>`;
                    });
                }
                $('#productsTable tbody').html(html);

                productsDataTable = $('#productsTable').DataTable({
                    "pageLength": 10,
                    "order": [[0, 'desc']]
                });
            }
        });
    };

    window.deleteProduct = function(id) {
        Swal.fire({
            title: 'Delete Product?',
            text: 'This action cannot be undone',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete'
        }).then(result => {
            if (result.isConfirmed) {
                $.ajax({
                    method: 'DELETE',
                    url: `${url}api/v1/items/${id}`,
                    headers: getAuthHeader(),
                    success: function() {
                        Swal.fire('Deleted', 'Product deleted successfully', 'success').then(() => {
                            loadProducts();
                        });
                    },
                    error: function() {
                        Swal.fire('Error', 'Failed to delete product', 'error');
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
                if ($.fn.DataTable.isDataTable('#ordersTable')) {
                    ordersDataTable.destroy();
                }

                let html = '';
                if (data.rows) {
                    data.rows.forEach(order => {
                        const date = new Date(order.created_at).toLocaleDateString();
                        const statusBadge = order.status === 'completed' ? 'badge-success' : order.status === 'pending' ? 'badge-warning' : 'badge-danger';
                        html += `<tr>
                            <td>#${order.id}</td>
                            <td>${order.User ? order.User.name : 'Unknown'}</td>
                            <td>${date}</td>
                            <td><span class="badge ${statusBadge}">${order.status}</span></td>
                            <td>₱${parseFloat(order.total_amount || 0).toFixed(2)}</td>
                            <td>
                                <button class="btn btn-sm btn-info btn-action" onclick="editOrderStatus(${order.id}, '${order.status}')"><i class="fas fa-edit"></i></button>
                                <button class="btn btn-sm btn-danger btn-action" onclick="deleteOrder(${order.id})"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>`;
                    });
                }
                $('#ordersTable tbody').html(html);

                ordersDataTable = $('#ordersTable').DataTable({
                    "pageLength": 10,
                    "order": [[0, 'desc']]
                });
            },
            error: function() {
                $('#ordersTable tbody').html('<tr><td colspan="6" class="text-center">No orders found</td></tr>');
            }
        });
    };

    window.editOrderStatus = function(id, currentStatus) {
        Swal.fire({
            title: 'Update Order Status',
            input: 'select',
            inputOptions: {
                'pending': 'Pending',
                'processing': 'Processing',
                'completed': 'Completed',
                'cancelled': 'Cancelled'
            },
            inputValue: currentStatus,
            showCancelButton: true,
            confirmButtonText: 'Update'
        }).then(result => {
            if (result.isConfirmed && result.value) {
                $.ajax({
                    method: 'PUT',
                    url: `${url}api/v1/orders/${id}`,
                    headers: getAuthHeader(),
                    data: JSON.stringify({status: result.value}),
                    contentType: 'application/json',
                    success: function() {
                        Swal.fire('Success', 'Order status updated', 'success').then(() => {
                            loadOrders();
                        });
                    },
                    error: function() {
                        Swal.fire('Error', 'Failed to update order', 'error');
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
            confirmButtonText: 'Delete'
        }).then(result => {
            if (result.isConfirmed) {
                $.ajax({
                    method: 'DELETE',
                    url: `${url}api/v1/orders/${id}`,
                    headers: getAuthHeader(),
                    success: function() {
                        Swal.fire('Deleted', 'Order deleted successfully', 'success').then(() => {
                            loadOrders();
                        });
                    },
                    error: function() {
                        Swal.fire('Error', 'Failed to delete order', 'error');
                    }
                });
            }
        });
    };

    // USER MANAGEMENT
    const loadUsers = function() {
        $.ajax({
            method: 'GET',
            url: `${url}api/v1/users`,
            headers: getAuthHeader(),
            dataType: 'json',
            success: function(data) {
                if ($.fn.DataTable.isDataTable('#usersTable')) {
                    usersDataTable.destroy();
                }

                let html = '';
                if (data.rows) {
                    data.rows.forEach(user => {
                        const lastLogin = user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never';
                        const statusBadge = user.is_active ? 'badge-success' : 'badge-danger';
                        html += `<tr>
                            <td>${user.id}</td>
                            <td>${user.name}</td>
                            <td>${user.email}</td>
                            <td><span class="badge badge-info">${user.role}</span></td>
                            <td><span class="badge ${statusBadge}">${user.is_active ? 'Active' : 'Inactive'}</span></td>
                            <td>${lastLogin}</td>
                            <td>
                                <button class="btn btn-sm btn-warning btn-action" onclick="changeUserRole(${user.id}, '${user.role}')"><i class="fas fa-key"></i> Role</button>
                                <button class="btn btn-sm btn-${user.is_active ? 'danger' : 'success'} btn-action" onclick="toggleUserStatus(${user.id}, ${user.is_active})"><i class="fas fa-${user.is_active ? 'ban' : 'check'}"></i></button>
                            </td>
                        </tr>`;
                    });
                }
                $('#usersTable tbody').html(html);

                usersDataTable = $('#usersTable').DataTable({
                    "pageLength": 10,
                    "order": [[0, 'desc']]
                });
            },
            error: function() {
                $('#usersTable tbody').html('<tr><td colspan="7" class="text-center">No users found</td></tr>');
            }
        });
    };

    window.changeUserRole = function(userId, currentRole) {
        Swal.fire({
            title: 'Change User Role',
            input: 'select',
            inputOptions: {
                'customer': 'Customer',
                'manager': 'Manager',
                'admin': 'Admin'
            },
            inputValue: currentRole,
            showCancelButton: true,
            confirmButtonText: 'Update'
        }).then(result => {
            if (result.isConfirmed && result.value) {
                $.ajax({
                    method: 'PUT',
                    url: `${url}api/v1/users/${userId}/role`,
                    headers: getAuthHeader(),
                    data: JSON.stringify({role: result.value}),
                    contentType: 'application/json',
                    success: function() {
                        Swal.fire('Success', 'User role updated', 'success').then(() => {
                            loadUsers();
                        });
                    },
                    error: function(error) {
                        Swal.fire('Error', error.responseJSON?.error || 'Failed to update role', 'error');
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
            confirmButtonText: 'Yes'
        }).then(result => {
            if (result.isConfirmed) {
                $.ajax({
                    method: 'PUT',
                    url: `${url}api/v1/users/${userId}/${endpoint}`,
                    headers: getAuthHeader(),
                    contentType: 'application/json',
                    success: function() {
                        Swal.fire('Success', `User ${action}d successfully`, 'success').then(() => {
                            loadUsers();
                        });
                    },
                    error: function(error) {
                        Swal.fire('Error', error.responseJSON?.error || `Failed to ${action} user`, 'error');
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
                if ($.fn.DataTable.isDataTable('#stockTable')) {
                    stockDataTable.destroy();
                }

                let html = '';
                if (data.rows) {
                    data.rows.forEach(item => {
                        const quantity = item.Stock ? item.Stock.quantity : 0;
                        const threshold = 5;
                        let statusBadge = quantity > threshold ? 'badge-success' : 'badge-warning';
                        if (quantity === 0) statusBadge = 'badge-danger';

                        html += `<tr>
                            <td>${item.camera_brand} ${item.camera_model}</td>
                            <td>${quantity}</td>
                            <td>${threshold}</td>
                            <td><span class="badge ${statusBadge}">${quantity <= threshold ? 'Low Stock' : 'In Stock'}</span></td>
                            <td>
                                <button class="btn btn-sm btn-primary btn-action" onclick="updateStockQty(${item.item_id})"><i class="fas fa-plus"></i> Add Stock</button>
                            </td>
                        </tr>`;
                    });
                }
                $('#stockTable tbody').html(html);

                stockDataTable = $('#stockTable').DataTable({
                    "pageLength": 10
                });
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
            confirmButtonText: 'Add'
        }).then(result => {
            if (result.isConfirmed && result.value) {
                // Get current stock
                $.ajax({
                    method: 'GET',
                    url: `${url}api/v1/items/${itemId}`,
                    headers: getAuthHeader(),
                    success: function(data) {
                        const currentQty = data.result.Stock ? data.result.Stock.quantity : 0;
                        const newQty = parseInt(currentQty) + parseInt(result.value);

                        $.ajax({
                            method: 'PUT',
                            url: `${url}api/v1/items/${itemId}`,
                            headers: getAuthHeader(),
                            data: JSON.stringify({
                                camera_brand: data.result.camera_brand,
                                camera_model: data.result.camera_model,
                                description: data.result.description,
                                cost_price: data.result.cost_price,
                                sell_price: data.result.sell_price,
                                quantity: newQty
                            }),
                            contentType: 'application/json',
                            success: function() {
                                Swal.fire('Success', 'Stock updated', 'success').then(() => {
                                    loadStock();
                                });
                            }
                        });
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
            confirmButtonText: 'Logout'
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
