$(document).ready(function () {
    const url = 'http://localhost:3000/'

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

    const persistAuthState = (key, value) => {
        sessionStorage.setItem(key, JSON.stringify(value));
        localStorage.setItem(key, JSON.stringify(value));
    };

    const getStoredToken = () => {
        const rawToken = sessionStorage.getItem('token') || localStorage.getItem('token');
        if (!rawToken) return null;
        try {
            return JSON.parse(rawToken);
        } catch (error) {
            return rawToken;
        }
    };

    const getStoredUserRole = () => {
        const rawRole = sessionStorage.getItem('userRole') || localStorage.getItem('userRole');
        if (!rawRole) return '';
        try {
            return JSON.parse(rawRole);
        } catch (error) {
            return rawRole;
        }
    };

    const getStoredUserEmail = () => {
        const rawEmail = sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail');
        if (!rawEmail) return '';
        try {
            return JSON.parse(rawEmail);
        } catch (error) {
            return rawEmail;
        }
    };

    const getStoredUserName = () => {
        const rawName = sessionStorage.getItem('userName') || localStorage.getItem('userName');
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
            },
            error: function (error) {
                console.error('Load profile error:', error);
                if (error.status === 401) {
                    window.location.href = 'login.html';
                }
            }
        });
    });
})
