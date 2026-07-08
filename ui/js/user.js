$(document).ready(function () {
    const url = 'http://localhost:3000/'

    const escapeHtml = (value) => String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const getStoredUserId = () => {
        const rawUserId = sessionStorage.getItem('userId');

        if (!rawUserId) {
            return null;
        }

        try {
            return JSON.parse(rawUserId);
        } catch (error) {
            return rawUserId;
        }
    }

    const clearStaleLocalAuth = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
    };

    const persistAuthState = (key, value) => {
        clearStaleLocalAuth();
        sessionStorage.setItem(key, JSON.stringify(value));
    };

    clearStaleLocalAuth();

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

    const getStoredUserEmail = () => {
        const rawEmail = sessionStorage.getItem('userEmail');
        if (!rawEmail) return '';
        try {
            return JSON.parse(rawEmail);
        } catch (error) {
            return rawEmail;
        }
    };

    const getStoredUserName = () => {
        const rawName = sessionStorage.getItem('userName');
        if (!rawName) return '';
        try {
            return JSON.parse(rawName);
        } catch (error) {
            return rawName;
        }
    };

    $("#register").on('click', function (e) {
        e.preventDefault();
        let name = $("#name").val().trim()
        let email = $("#email").val().trim()
        let password = $("#password").val()

        const missingFields = [];
        if (!name) missingFields.push('name');
        if (!email) missingFields.push('email');
        if (!password) missingFields.push('password');

        if (missingFields.length) {
            const fieldLabel = missingFields.length === 1
                ? missingFields[0]
                : `${missingFields.slice(0, -1).join(', ')} and ${missingFields[missingFields.length - 1]}`;
            Swal.fire({
                icon: "error",
                text: `Failed: ${fieldLabel} ${missingFields.length > 1 ? 'are' : 'is'} required.`
            });
            return;
        }

        if (!email.includes('@')) {
            Swal.fire({
                icon: "error",
                text: "Failed: email format is invalid (missing @)."
            });
            return;
        }

        if (password.length < 8) {
            Swal.fire({
                icon: "error",
                text: "Failed: password must be at least 8 characters."
            });
            return;
        }

        let user = {
            name,
            email,
            password
        }
        $.ajax({
            method: "POST",
            url: `${url}api/v1/register`,
            data: JSON.stringify(user),
            contentType: 'application/json; charset=utf-8',
            dataType: "json",
            success: function (data) {
                console.log(data);
                Swal.fire({
                    icon: "success",
                    title: "Account created",
                    text: "Your account was created successfully. Please sign in to continue.",
                    position: 'center',
                    confirmButtonText: 'Go to login'

                }).then(() => {
                    window.location.href = 'login.html';
                });
            },
            error: function (error) {
                console.log(error);
                Swal.fire({
                    icon: "error",
                    text: error.responseJSON?.message || error.responseJSON?.error || 'Registration failed'
                });
            }
        });
    });

    const defaultAvatarSrc = $('#avatarPreview').attr('src');
    let initialProfileState = {
        fname: '',
        lname: '',
        addressline: '',
        zipcode: '',
        phone: '',
        image_path: null,
        avatarRemoved: false
    };

    const profileHasChanged = (currentState) => {
        if (currentState.fname !== initialProfileState.fname) return true;
        if (currentState.lname !== initialProfileState.lname) return true;
        if (currentState.addressline !== initialProfileState.addressline) return true;
        if (currentState.zipcode !== initialProfileState.zipcode) return true;
        if (currentState.phone !== initialProfileState.phone) return true;
        if (currentState.avatarRemoved && initialProfileState.image_path) return true;
        if (currentState.avatarFile) return true;
        return false;
    };

    $('#avatar').on('change', function () {
        initialProfileState.avatarRemoved = false;
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                $('#avatarPreview').attr('src', e.target.result);
            };
            reader.readAsDataURL(file);
        } else {
            $('#avatarPreview').attr('src', defaultAvatarSrc);
        }
    });

    $('#removeAvatarBtn').on('click', function () {
        $('#avatar').val('');
        $('#avatarPreview').attr('src', defaultAvatarSrc);
        initialProfileState.avatarRemoved = true;
    });

    const getProfileCurrentState = () => ({
        fname: $('#firstName').val().trim(),
        lname: $('#lastName').val().trim(),
        addressline: $('#address').val().trim(),
        zipcode: $('#zipcode').val().trim(),
        phone: $('#phone').val().trim(),
        avatarFile: $('#avatar')[0]?.files?.length > 0,
        avatarRemoved: initialProfileState.avatarRemoved
    });

    $("#login").on('click', function (e) {
        e.preventDefault();

        const showLoginError = message => {
            $('#loginError').html(`<span>${message}</span>`);
            $('#email, #password').addClass('input-error');
        }

        const clearLoginError = () => {
            $('#loginError').empty();
            $('#email, #password').removeClass('input-error');
        }

        let email = $("#email").val().trim()
        let password = $("#password").val()

        clearLoginError();

        if (!email && !password) {
            showLoginError('Failed: email and password are required.');
            return;
        }

        if (!email) {
            showLoginError('Failed: email is required.');
            return;
        }

        if (!password) {
            showLoginError('Failed: password is required.');
            return;
        }

        if (!email.includes('@')) {
            showLoginError('Failed: email format is invalid (missing @).');
            return;
        }

        let user = {
            email,
            password
        }
        $.ajax({
            method: "POST",
            url: `${url}api/v1/login`,
            data: JSON.stringify(user),
            processData: false,
            contentType: 'application/json; charset=utf-8',
            dataType: "json",
            success: function (data) {
                console.log(data);
                Swal.fire({
                    text: data.success,
                    showConfirmButton: false,
                    position: 'bottom-right',
                    timer: 1000,
                    timerProgressBar: true

                });
                // sessionStorage.setItem('token', JSON.stringify(data.access_token))
                persistAuthState('token', data.token)
                persistAuthState('userId', data.user.id)
                persistAuthState('userRole', data.user.role)
                persistAuthState('userName', data.user.name)
                persistAuthState('userEmail', data.user.email)

                // Redirect based on user role
                if (data.user.role === 'admin' || data.user.role === 'manager') {
                    window.location.href = 'admin.html'
                } else {
                    window.location.href = 'index.html'
                }
            },
            error: function (error) {
                console.log(error);
                showLoginError(error.responseJSON?.message || error.responseJSON?.error || 'please try again');
            }
        });
    });

    $("#profileForm").on('submit', function (event) {
        event.preventDefault();
        const userId = getStoredUserId();

        if (!userId) {
            Swal.fire({
                icon: 'warning',
                text: 'Please log in again before updating your profile.'
            });
            window.location.href = 'login.html';
            return;
        }



        const currentState = getProfileCurrentState();
        if (!profileHasChanged(currentState)) {
            Swal.fire({
                icon: 'info',
                title: 'Nothing to update',
                text: 'If you want to change your profile, please modify at least one field before saving.',
                confirmButtonText: 'Understood'
            });
            return;
        }

        const newPassword = $('#newPassword').val().trim();
        const confirmPassword = $('#confirmPassword').val().trim();
        const currentPassword = $('#currentPassword').val().trim();

        const wantsPasswordChange = newPassword || confirmPassword;

        if (wantsPasswordChange) {
            if (!currentPassword) {
                Swal.fire({ icon: 'error', text: 'Current password is required to change your password' });
                return;
            }
            if (!newPassword || !confirmPassword) {
                Swal.fire({ icon: 'error', text: 'Please complete both new password fields' });
                return;
            }
            if (newPassword !== confirmPassword) {
                Swal.fire({ icon: 'error', text: 'New password and confirmation do not match' });
                return;
            }
        }

        const data = $('#profileForm')[0];
        const token = getStoredToken();

        const formData = new FormData(data);
        formData.append('userId', userId)

        $.ajax({
            method: "POST",
            url: `${url}api/v1/update-profile`,
            headers: { 
                Authorization: `Bearer ${token}` 
            },
            data: formData,
            contentType: false,
            processData: false,
            dataType: "json",
            success: function (data) {
                console.log(data);
                if (data.customer) {
                    const fullName = `${data.customer.fname || ''} ${data.customer.lname || ''}`.trim();
                    if (fullName) {
                        persistAuthState('userName', fullName);
                        $('#previewName').text(fullName);
                    }
                    if (data.customer.image_path) {
                        const normalizedPath = String(data.customer.image_path).replace(/\\/g, '/').replace(/^\/+/, '');
                        $('#avatarPreview').attr('src', `${url}${normalizedPath}`);
                    }
                }
                Swal.fire({
                    icon: 'success',
                    text: 'Profile updated successfully',
                    showConfirmButton: false,
                    timer: 1500
                }).then(() => {
                    $('#currentPassword').val('');
                    $('#newPassword').val('');
                    $('#confirmPassword').val('');
                });
            },
            error: function (error) {
                console.log('Profile update error:', error);
                const errorMsg = error.responseJSON?.error || error.responseJSON?.message || error.statusText || 'Failed to update profile';
                Swal.fire({
                    icon: 'error',
                    title: 'Update Failed',
                    text: errorMsg,
                    didOpen: () => {
                        console.log('Backend error details:', error.responseJSON);
                    }
                });
            }
        });
    });

    $("#deactivateBtn").on('click', function (e) {
        e.preventDefault();
        let email = $("#email").val()
        let user = {
            email,
        }
        $.ajax({
            method: "DELETE",
            url: `${url}api/v1/deactivate`,
            data: JSON.stringify(user),
            processData: false,
            contentType: 'application/json; charset=utf-8',
            dataType: "json",
            success: function (data) {
                console.log(data);
                Swal.fire({
                    text: data.message,
                    showConfirmButton: false,
                    position: 'bottom-right',
                    timer: 2000,
                    timerProgressBar: true
                });
                sessionStorage.removeItem('userId')
                sessionStorage.removeItem('token')
                sessionStorage.removeItem('userRole')
                sessionStorage.removeItem('userName')
                window.location.href = 'home.html'
            },
            error: function (error) {
                console.log(error);
                Swal.fire({
                    icon: 'error',
                    text: error.responseJSON?.message || error.responseJSON?.error || 'Failed to deactivate account'
                });
            }
        });
    });

    $("#profileResetBtn").on('click', function (e) {
        e.preventDefault();
        location.reload();
    });

    loadSharedHeader(function () {
        const token = getStoredToken();
        const userRole = String(getStoredUserRole() || '').toLowerCase();

        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        if (userRole && userRole !== 'customer') {
            window.location.href = 'admin.html';
            return;
        }

        const storedName = getStoredUserName();
        const storedEmail = getStoredUserEmail();
        if (storedName) $('#previewName').text(storedName);
        if (storedEmail) $('#previewEmail').text(storedEmail);

        $.ajax({
            method: 'GET',
            url: `${url}api/v1/profile`,
            headers: { Authorization: `Bearer ${token}` },
            dataType: 'json',
            success: function (data) {
                const user = data.user || {};
                const customer = data.customer || {};

                $('#profileUserId').val(user.id || getStoredUserId() || '');
                $('#previewName').text(`${customer.fname || user.name || ''} ${customer.lname || ''}`.trim() || user.name || 'Customer');
                $('#previewEmail').text(user.email || storedEmail || '');

                $('#firstName').val(customer.fname || '');
                $('#lastName').val(customer.lname || '');
                $('#address').val(customer.addressline || '');
                $('#zipcode').val(customer.zipcode || '');
                $('#phone').val(customer.phone || '');
                if (customer.image_path) {
                    const normalizedPath = String(customer.image_path).replace(/\\/g, '/').replace(/^\/+/, '');
                    $('#avatarPreview').attr('src', `${url}${normalizedPath}`);
                }

                initialProfileState = {
                    fname: customer.fname || '',
                    lname: customer.lname || '',
                    addressline: customer.addressline || '',
                    zipcode: customer.zipcode || '',
                    phone: customer.phone || '',
                    image_path: customer.image_path || null,
                    avatarRemoved: false
                };

                const summary = [
                    customer.addressline ? `Address: ${customer.addressline}` : '',
                    customer.zipcode ? `ZIP: ${customer.zipcode}` : '',
                    customer.phone ? `Phone: ${customer.phone}` : ''
                ].filter(Boolean).join('<br>');

                $('#profileSummary').html(summary || 'No profile details saved yet.');
                // Load purchase history for this customer
                loadPurchaseHistory();
            },
            error: function (error) {
                console.error('Load profile error:', error);
                if (error.status === 401) {
                    window.location.href = 'login.html';
                }
            }
        });

        // Purchase history and review helpers
        const renderOrderLine = (line, orderStatus) => {
            const item = line.Item || {};
            const img = item.img_path ? `${url}${String(item.img_path).replace(/^\/+/, '')}` : 'https://via.placeholder.com/80';
            const titleText = item.camera_model || item.description || 'Item';
            const showLeaveReview = String(orderStatus || '').toLowerCase() === 'completed';
            return `
                <div class="purchase-history-line">
                    <img src="${img}" alt="${escapeHtml(titleText)}" />
                    <div class="purchase-history-main">
                        <div class="purchase-history-title">${escapeHtml(titleText)}</div>
                        <div class="purchase-history-meta">Qty: ${line.quantity || 1} • ₱${parseFloat(item.sell_price || 0).toFixed(2)}</div>
                    </div>
                    <div class="purchase-history-actions">
                        ${showLeaveReview ? `<button class="btn btn-sm btn-outline-primary btn-leave-review" data-item-id="${item.item_id}">Leave Review</button>` : ''}
                        <button class="btn btn-sm btn-outline-secondary view-reviews-btn" data-id="${item.item_id}">View Reviews</button>
                    </div>
                </div>
            `;
        };

        const loadPurchaseHistory = () => {
            const token = getStoredToken();
            if (!token) {
                $('#purchaseHistory').html('<p class="text-muted">Please login to see purchases.</p>');
                return;
            }
            $.ajax({ method: 'GET', url: `${url}api/v1/my/orders`, headers: { Authorization: `Bearer ${token}` }, dataType: 'json', success: function (data) {
                const rows = data.rows || [];
                if (!rows.length) { $('#purchaseHistory').html('<p class="text-muted">No purchases yet.</p>'); return; }
                const html = rows.map(order => {
                    const lines = (order.OrderLines || []).map(line => renderOrderLine(line, order.status)).join('');
                    return `<div style="border-bottom:1px solid #eee;padding:8px 0;margin-bottom:8px"><div style="font-weight:700">Order #${String(order.id).padStart(6,'0')} — ${order.status}</div><div style="margin-top:8px">${lines}</div></div>`;
                }).join('');
                $('#purchaseHistory').html(html);
            }, error: function (err) { console.error('Failed to load purchases', err); $('#purchaseHistory').html('<p class="text-muted">Unable to load purchases.</p>'); } });
        };

        // Open reviews modal when user clicks leave review (from profile purchases)
        $(document).on('click', '.btn-leave-review', function (e) {
            e.preventDefault();
            const itemId = $(this).data('item-id');
            $('#reviewItemId').val(itemId);
            $('#reviewsList').html('');
            $('#reviewForm')[0].reset();
            const token = getStoredToken();
            if (!token) { Swal.fire('Please login to leave a review'); return; }
            // Check eligibility
            $.ajax({ url: `${url}api/v1/reviews/eligible?item_id=${itemId}`, headers: { Authorization: `Bearer ${token}` }, success: function (resp) {
                if (resp && resp.eligible) {
                    $('#reviewFormContainer').show();
                } else if (resp && resp.alreadyReviewed) {
                    $('#reviewFormContainer').hide();
                    $('#reviewsList').html('<p>You have already reviewed this item.</p>');
                } else {
                    $('#reviewFormContainer').hide();
                    $('#reviewsList').html('<p>You can only review items you purchased and that have been completed.</p>');
                }
                // load existing reviews for reference
                $.ajax({ url: `${url}api/v1/public/items/${itemId}/reviews`, success: function (data) {
                    const rows = data.rows || [];
                    if (!rows.length) { /* nothing */ } else {
                        const html = rows.map(r => `<div style="margin-bottom:0.5rem"><strong>${escapeHtml((r.Customer?.fname||'')+' '+(r.Customer?.lname||'')).trim()||'Customer'}</strong> — ${'★'.repeat(Math.round(r.rating||0))}<div>${escapeHtml(r.comment||'')}</div></div>`).join('');
                        $('#reviewsList').append(html);
                    }
                    $('#reviewsModal').modal('show');
                }, error: function () { $('#reviewsModal').modal('show'); } });
            }, error: function () { Swal.fire('Error checking eligibility'); } });
        });

        // Open reviews modal when user clicks View Reviews in purchase history
        $(document).on('click', '.view-reviews-btn', function (e) {
            e.preventDefault();
            const itemId = $(this).data('id');
            $('#reviewItemId').val(itemId);
            $('#reviewForm')[0].reset();
            $('#reviewFormContainer').hide();
            $('#reviewsList').html('<p>Loading reviews...</p>');
            $.ajax({ url: `${url}api/v1/public/items/${itemId}/reviews`, success: function (data) {
                const rows = data.rows || [];
                if (!rows.length) {
                    $('#reviewsList').html('<p>No reviews yet.</p>');
                } else {
                    const html = rows.map(r => `<div style="margin-bottom:0.75rem"><div><strong>${escapeHtml((r.Customer?.fname||'')+' '+(r.Customer?.lname||'')).trim()||'Customer'}</strong> — ${'★'.repeat(Math.round(r.rating||0))}</div><div style="margin-top:0.25rem">${escapeHtml(r.comment||'')}</div></div>`).join('');
                    $('#reviewsList').html(html);
                }
                $('#reviewsModal').modal('show');
            }, error: function () {
                $('#reviewsList').html('<p>Error loading reviews.</p>');
                $('#reviewsModal').modal('show');
            } });
        });

        // Submit review from profile modal
        $('#reviewForm').on('submit', function (e) {
            e.preventDefault();
            const token = getStoredToken();
            if (!token) { Swal.fire('Please login'); return; }
            const form = new FormData(this);
            $.ajax({ url: `${url}api/v1/reviews`, method: 'POST', data: form, headers: { Authorization: `Bearer ${token}` }, processData: false, contentType: false, success: function () { Swal.fire('Review submitted'); $('#reviewsModal').modal('hide'); loadPurchaseHistory(); }, error: function (err) { Swal.fire('Error', err.responseJSON?.message || 'Could not submit review', 'error'); } });
        });
    });
})
