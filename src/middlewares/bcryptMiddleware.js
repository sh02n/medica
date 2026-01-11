const bcrypt = require("bcrypt");
const saltRounds = 10;

// Hash the password in the request body
module.exports.hashPassword = function (req, res, next) {
    const password = req.body.password;

    if (!password) {
        console.error("Error: Missing password in request body.");
        return res.status(400).json({ error: "Password is required." });
    }

    bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) {
            console.error("Error bcrypt:", err);
            return res.status(500).json({ error: "Error hashing password." });
        }

        res.locals.hash = hash;  // Store the hash in res.locals
        next();
    });
};


module.exports.comparePassword = function (req, res, next) {
  const { password } = req.body; // Plaintext password from the request body
  const hash = res.locals.passwordHash; // Hashed password retrieved from the database

  if (!password || !hash) {
    return res.status(400).json({ error: "Password and hash are required." });
  }

  // Compare the plaintext password with the stored hash
  bcrypt.compare(password, hash, (err, isMatch) => {
    if (err) {
      console.error('Error bcrypt:', err);
      return res.status(500).json({ error: 'Error comparing passwords.' });
    }

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    console.log('Password matched successfully!');
    next();  // Proceed to token generation
  });
};