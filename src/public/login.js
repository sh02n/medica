document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok && data.token) {
      localStorage.setItem('jwt_token', data.token);
      localStorage.setItem('user_id', data.id);
      localStorage.setItem('username', data.username); 
      localStorage.setItem("role", data.role);
      if (data.role) localStorage.setItem('role', data.role); // if you include role in sendToken later

      showCustomAlert('Login Successful', 'You are now signed in.', 'success');

      setTimeout(() => {
        window.location.href = '/customers/customers.html';
      }, 900);
    } else {
      showCustomAlert('Login Failed', data.message || data.error || 'Invalid credentials.', 'error');
    }
  } catch (error) {
    console.error('Error during login:', error);
    showCustomAlert('Oops...', 'An error occurred. Please try again.', 'error');
  }
});

function showCustomAlert(title, message, type) {
  const alertBox = document.getElementById('customAlert');
  const alertTitle = document.getElementById('alertTitle');
  const alertMessage = document.getElementById('alertMessage');
  const alertButton = document.getElementById('alertCloseBtn');

  alertTitle.textContent = title;
  alertMessage.textContent = message;

  // Color hint
  if (type === 'success') {
    alertTitle.style.color = '#1e7e34';
  } else {
    alertTitle.style.color = '#b21f2d';
  }

  alertBox.style.display = 'flex';

  alertButton.onclick = () => {
    alertBox.style.display = 'none';
  };
}
