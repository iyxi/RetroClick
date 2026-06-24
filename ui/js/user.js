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

    $("#register").on('click', function (e) {
        e.preventDefault();
        let name = $("#name").val()
        let email = $("#email").val()
        let password = $("#password").val()
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
                    text: "register success",
                    position: 'bottom-right'

                }).then(() => {
                    window.location.href = 'index.html';
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

    $('#avatar').on('change', function () {
        const file = this.files[0];
        // console.log(this.files[0])
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                console.log(e.target.result)
                $('#avatarPreview').attr('src', e.target.result);
            };
            reader.readAsDataURL(file);
        }
    });

    $("#login").on('click', function (e) {
        e.preventDefault();

        const showLoginError = message => {
            $('#loginError').html(`Failed login <span>${message}</span>`);
            $('#email, #password').addClass('input-error');
        }

        const clearLoginError = () => {
            $('#loginError').empty();
            $('#email, #password').removeClass('input-error');
        }

        let email = $("#email").val().trim()
        let password = $("#password").val()

        clearLoginError();

        if (!email.includes('@')) {
            showLoginError('no @ in email');
            return;
        }

        if (!password) {
            showLoginError('password is required');
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
                sessionStorage.setItem('token', JSON.stringify(data.token))
                sessionStorage.setItem('userId', JSON.stringify(data.user.id))

                window.location.href = 'profile.html'
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

        const data = $('#profileForm')[0];

        const formData = new FormData(data);
        formData.append('userId', userId)

        $.ajax({
            method: "POST",
            url: `${url}api/v1/update-profile`,
            data: formData,
            contentType: false,
            processData: false,
            dataType: "json",
            success: function (data) {
                console.log(data);
                Swal.fire({
                    icon: 'success',
                    text: 'Profile updated successfully',
                    showConfirmButton: false,
                    timer: 1500
                }).then(() => {
                    window.location.href = 'index.html';
                });
            },
            error: function (error) {
                console.log(error);
                Swal.fire({
                    icon: 'error',
                    text: error.responseJSON?.error || 'Failed to update profile'
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

    $("#logout").on('click', function (e) {
        e.preventDefault();
        Swal.fire({
            text: 'logout',
            showConfirmButton: false,
            position: 'bottom-right',
            timer: 1000,
            timerProgressBar: true

        });
        sessionStorage.removeItem('token')
        sessionStorage.removeItem('userId')
        window.location.href = 'login.html'

    });

    $("#profile").load("header.html", function () {
        // After header is loaded, check sessionStorage for userId
        if (sessionStorage.getItem('token')) {
            // Change Login link to Logout
            const $loginLink = $('a.nav-link[href="login.html"]');
            $loginLink.text('Logout').attr({ 'href': '#!', 'id': 'logout-link' }).on('click', function (e) {
                e.preventDefault();
                Swal.fire({
                    text: 'logout',
                    showConfirmButton: false,
                    position: 'bottom-right',
                    timer: 1000,
                    timerProgressBar: true

                });
                sessionStorage.clear();
                window.location.href = 'login.html';
            });
        }
        else {
            window.location.href = 'login.html';
        }
    });
})
