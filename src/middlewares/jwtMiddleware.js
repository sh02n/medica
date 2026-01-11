require("dotenv").config();
const jwt = require("jsonwebtoken");

const secretKey = process.env.JWT_SECRET_KEY;
const tokenDuration = process.env.JWT_EXPIRES_IN;
const tokenAlgorithm = process.env.JWT_ALGORITHM;

console.log(secretKey),
console.log(tokenDuration),
console.log(tokenAlgorithm),

module.exports.generateToken = function (req, res, next) {
     console.log('Before generating token:', res.locals.id, res.locals.username); // Debugging log
    
const payload = {
  id: res.locals.id,
  username: res.locals.username,
  role: res.locals.role,          
  timestamp: new Date(),
};


    const options = {
        algorithm: tokenAlgorithm,
        expiresIn: tokenDuration,
    };

    try {
        const token = jwt.sign(payload, secretKey, options);
        res.locals.token = token;
        next();
    } catch (err) {
        console.error("Error generating JWT:", err);
        res.status(500).json({ error: "Error generating token" });
    }
};


// Sends the token to the client.
module.exports.sendToken = function (req, res, next) {
    
    res.status(200).json({
        message: res.locals.message,
        token: res.locals.token,
        username: res.locals.username,
        id: res.locals.id,
        role: res.locals.role
    });
    console.log(res.locals.token)
};

module.exports.verifyToken = function (req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.substring(7); // Extract token after "Bearer "

    const callback = function (err, decoded) {
        if (err) {
            return res.status(401).json({ error: "Invalid token" });
        }

        // Store decoded values in res.locals for later use
        res.locals.username = decoded.username;
        res.locals.id = decoded.id;
        res.locals.tokenTimestamp = decoded.timestamp;
        res.locals.role = decoded.role;

        next();
    };

    jwt.verify(token, secretKey, callback);
};


// Uncomment and use this function if needed to verify admin role
// module.exports.verifyIsAdmin = function (req, res, next) {
//     console.log(res.locals.role, typeof res.locals.role);
//     if (res.locals.role !== 2) {
//         return res.status(403).json({ error: "Requires administrator role." });
//     }
//     next();
// };
