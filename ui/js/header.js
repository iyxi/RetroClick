const sharedHeaderMarkup = `
<nav class="navbar navbar-expand-lg navbar-dark">
  <div class="container">
    <a class="navbar-brand" href="index.html">
      <i class="fas fa-camera"></i> RetroClick
    </a>
    <button
      class="navbar-toggler"
      type="button"
      data-toggle="collapse"
      data-target="#navbarNav"
      aria-controls="navbarNav"
      aria-expanded="false"
      aria-label="Toggle navigation"
    >
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="navbarNav">
      <ul class="navbar-nav ml-auto">
        <li class="nav-item">
          <a class="nav-link" href="index.html">Home</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="#featured">Shop</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="home.html">Browse</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="cart.html"><i class="fas fa-shopping-cart"></i> Cart</a>
        </li>
        <li class="nav-item">
          <a class="nav-link" id="nav-login" href="login.html">Login</a>
        </li>
      </ul>
    </div>
  </div>
</nav>
`;

const setHeaderState = () => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  const userRoleRaw = sessionStorage.getItem('userRole') || localStorage.getItem('userRole');
  let userRole = '';
  try {
    userRole = userRoleRaw ? JSON.parse(userRoleRaw) : '';
  } catch (error) {
    userRole = userRoleRaw || '';
  }
  const $loginLink = $('#nav-login');
  const $navbarNav = $('.navbar-nav.ml-auto');

  if (!$loginLink.length) return;

  if (token) {
    const userRoleStr = String(userRole).toLowerCase();
    if (userRoleStr === 'customer' || !userRole) {
      // For customers: show Profile link and add Logout link
      $loginLink.text('Profile').attr('href', 'profile.html');
      $loginLink.off('click');

      // Add logout link if it doesn't exist
      let $logoutLink = $('#nav-logout');
      if (!$logoutLink.length) {
        $logoutLink = $('<li class="nav-item"><a class="nav-link" id="nav-logout" href="#">Logout</a></li>');
        $navbarNav.append($logoutLink);
      }

      $logoutLink.off('click').on('click', function (e) {
        e.preventDefault();
        sessionStorage.clear();
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        window.location.href = 'login.html';
      });
    } else {
      // For admins/managers: show Logout in the nav-login link
      $loginLink.text('Logout').attr('href', '#');
      $loginLink.off('click').on('click', function (e) {
        e.preventDefault();
        sessionStorage.clear();
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        window.location.href = 'login.html';
      });

      // Remove logout link if it exists
      $('#nav-logout').closest('li').remove();
    }
  } else {
    $loginLink.text('Login').attr('href', 'login.html');
    $loginLink.off('click');

    // Remove logout link if it exists
    $('#nav-logout').closest('li').remove();
  }
};

const loadSharedFooter = () => {
  const $footer = $('#footer');
  if ($footer.length === 0) return;

  const footerPath = 'footer.html';

  const insertFooter = html => {
    $footer.html(html);
  };

  const insertFallbackFooter = () => {
    insertFooter(`
      <footer>
        <div class="container">
          <div class="row">
            <div class="col-md-3">
              <div class="footer-section">
                <h5><i class="fas fa-camera"></i> RetroClick</h5>
                <p>Your trusted source for authentic vintage and retro cameras worldwide.</p>
              </div>
            </div>
            <div class="col-md-3">
              <div class="footer-section">
                <h5>Quick Links</h5>
                <ul>
                  <li><a href="home.html">Shop</a></li>
                  <li><a href="#">About Us</a></li>
                  <li><a href="#">Contact</a></li>
                  <li><a href="#">FAQ</a></li>
                </ul>
              </div>
            </div>
            <div class="col-md-3">
              <div class="footer-section">
                <h5>Account</h5>
                <ul>
                  <li><a href="login.html">Sign In</a></li>
                  <li><a href="register.html">Register</a></li>
                  <li><a href="profile.html">My Profile</a></li>
                  <li><a href="cart.html">My Cart</a></li>
                </ul>
              </div>
            </div>
            <div class="col-md-3">
              <div class="footer-section">
                <h5>Contact</h5>
                <p>Email: info@retroclick.com</p>
                <p>Phone: +1 (555) 123-4567</p>
                <p>Hours: Mon-Fri 9AM-6PM</p>
              </div>
            </div>
          </div>
          <div class="footer-bottom">
            <p>&copy; 2026 RetroClick. All rights reserved.</p>
          </div>
        </div>
      </footer>
    `);
  };

  fetch(footerPath)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Footer fetch failed: ${response.status}`);
      }
      return response.text();
    })
    .then(html => insertFooter(html))
    .catch(() => insertFallbackFooter());
};

const highlightActiveNav = () => {
  const currentPath = window.location.pathname.split('/').pop();
  const links = {
    'index.html': 'index.html',
    'home.html': 'home.html',
    'cart.html': 'cart.html',
    'profile.html': 'profile.html'
  };

  const target = currentPath || 'index.html';
  $(`.navbar-nav .nav-item`).removeClass('active');
  $(`.navbar-nav .nav-link[href="${links[target] || target}"]`).closest('.nav-item').addClass('active');
};

function loadSharedHeader(callback) {
  const $header = $('#header');
  if ($header.length === 0) {
    if (typeof callback === 'function') callback();
    return;
  }

  $header.html(sharedHeaderMarkup);
  setHeaderState();
  highlightActiveNav();

  if (typeof callback === 'function') {
    callback();
  }
}

$(document).ready(function () {
  loadSharedHeader(loadSharedFooter);
});
