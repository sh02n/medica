// Check if user is logged in
if (!localStorage.getItem('jwt_token')) {
    console.log('User is not logged in');
    window.location.href = '/login.html'; // Redirect to login page
}

// Function to handle logout
window.logout = function () {
    console.log('Logging out');
    // Clear the authentication token from localStorage
    localStorage.clear();

    // Redirect the user to the login page
    window.location.href = '/login.html';
};
