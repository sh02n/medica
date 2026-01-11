function showCustomAlert(message) {
  const alertBox = document.getElementById('customAlert');
  const alertMessage = document.getElementById('alertMessage');
  const alertButton = document.getElementById('alertButton');

  alertMessage.textContent = message;
  alertBox.style.display = 'flex';

  alertButton.onclick = () => {
    alertBox.style.display = 'none';
  };
}

document.getElementById('registerForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const role = document.getElementById('role').value;

  try {
    const response = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role }),
    });

    const data = await response.json();

    if (response.ok) {
      showCustomAlert('Registration successful! Redirecting to login...');
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 1200);
    } else {
      showCustomAlert(data.message || data.error || 'Failed to register. Please try again.');
    }
  } catch (error) {
    console.error('Error during registration:', error);
    showCustomAlert('An error occurred. Please try again.');
  }
});
