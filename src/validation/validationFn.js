module.exports.validateRegister = function validateRegister(req, res, next) {
    var username = req.body.username;
    var email = req.body.email;
    var password = req.body.password;

    var usernameRE = /^[a-zA-Z0-9\s]*$/;
    var emailRE = /^.+@.+\.[a-zA-Z]+$/;
    var passwordRE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])[a-zA-Z0-9]{8,}$/;

    if (!usernameRE.test(username)) {
        return res.status(400).json({ message: "Invalid username. Only letters, numbers, and spaces are allowed." });
    }

    if (!emailRE.test(email)) {
        return res.status(400).json({ message: "Invalid email. Please provide a valid email address." });
    }

    if (!passwordRE.test(password)) {
        return res.status(400).json({ 
            message: "Invalid password. It must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, and one number." 
        });
    }

    next();
}