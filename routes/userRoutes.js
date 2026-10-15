const express = require("express");

const { 
    registerUser,
    loginUser,
    getProfile,
    verifyEmail,
    resendVerificationEmail,
    updateUserProfile,
    deleteUserAccount,
    uploadProfileImage,
    getAllUsers
} = require("../controllers/userController");

const authenticateUser = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerificationEmail);
router.get("/profile", authenticateUser, getProfile);
router.patch("/profile", authenticateUser, updateUserProfile);
router.delete("/profile", authenticateUser, deleteUserAccount);
router.put("/profile", authenticateUser, deleteUserAccount);
router.get("/all", authenticateUser, getAllUsers);

router.post(
    "/profile/image",
    authenticateUser,
    upload.single("profileImage"),
    uploadProfileImage
);

module.exports = router;