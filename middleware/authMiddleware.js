
const jwt = require("jsonwebtoken");

const authenticateUser = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        // Check whether the token was provided
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Access denied. No token provided."
            });
        }

        // Extract the token
        const token = authHeader.split(" ")[1];

        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach the decoded user information to the request
        req.user = decoded;

        // Allow the request to continue
        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
};

module.exports = authenticateUser;

