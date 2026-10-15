const prisma = require("../lib/prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("../lib/sendEmail");

const registerUser = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: "false",
                message: "Name, Email, and Password are required"
            });
        }

        // validate email format
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(email)) {
            return res.status(400).json ({
                success: "false",
                message: "Please provide a valid email address"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: "false",
                message: "Password must be atleast 8 characters long"
            });
        }

        if (phone && !/^\+?[0-9]{7,15}$/.test(phone)) {
            return res.status(400).json({
                success: "false",
                message: "Please provide a valid phone number"
            });
        }

        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() }
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "An account with this email already exist"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const verificationToken = crypto.randomBytes(32).toString("hex");

        const verificationTokenExpires = new Date(Date.now() + 15 * 60 * 1000);

        const user = await prisma.user.create({
            data: {
                name: name.trim(),
                email: email.toLowerCase().trim(),
                phone: phone || null,
                password: hashedPassword,
                verificationToken,
                verificationTokenExpires
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                isVerified: true,
                createdAt: true
            }
        });

        const verificationLink =
            `${process.env.APP_URL}/api/users/verify-email?token=${verificationToken}`;

        await sendEmail(
            user.email,
            "Verify Your Email Address",
            `
                <h2>Email Verification</h2>
                <p>Hello ${user.name},</p>
                <p>Please click the link below to verify your email address:</p>
                <a href="${verificationLink}">Verify My Email</a>
                <p>This link expires in 15 minutes.</p>
            `
        );

        return res.status(201).json({
            success: true,
            message: "Registration successful. Please check your email to verify your account.",
            user
        });

    } catch (error) {
        if (error.code === "p2002") {
            return res.status(409).json({
                success: false,
                message: "email and phone number already exists"
            });
        }

        console.error("Registeration error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong during registration"
        });
    }
};


const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check required fields
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() }
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Compare password with stored hash
        const isPasswordValid = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        
        if (!user.isVerified) {
            return res.status(403).json({
                success: false,
                message: "Please verify your email before logging in."
            });
        }


        // Generate JWT
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        // Return safe user details and token
        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                isVerified: user.isVerified
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong during login"
        });
    }
};

const getProfile = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                isVerified: true,
                createdAt: true
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Profile retrieved successfully",
            user
        });

    } catch (error) {
        console.error("Profile error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while retrieving the profile"
        });
    }
};



const verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Verification token is required"
            });
        }

        const user = await prisma.user.findFirst({
            where: {
                verificationToken: token,
                verificationTokenExpires: {
                    gt: new Date()
                }
            }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired verification link"
            });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                isVerified: true,
                verificationToken: null,
                verificationTokenExpires: null
            }
        });

        return res.status(200).json({
            success: true,
            message: "Email verified successfully. Your account is now verified."
        });

    } catch (error) {
        console.error("Email verification error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong during email verification"
        });
    }
};


const updateUserProfile = async (req, res) => {
    try {
        const { name, phone } = req.body;

        if (name === undefined && phone === undefined) {
            return res.status(400).json({
                success: false,
                message: "Provide a name or phone number to update."
            });
        }

        const data = {};

        if (name !== undefined) {
            if (typeof name !== "string" || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Name cannot be empty."
                });
            }

            data.name = name.trim();
        }

        if (phone !== undefined) {
            if (
                phone !== null &&
                (typeof phone !== "string" ||
                 !/^\+?[0-9]{7,15}$/.test(phone))
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Provide a valid phone number."
                });
            }

            data.phone = phone === null || phone === "" ? null : phone;
        }

        const user = await prisma.user.update({
            where: { id: req.user.userId },
            data,
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                isVerified: true,
                createdAt: true,
                updatedAt: true
            }
        });

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully.",
            user
        });

    } catch (error) {
        if (error.code === "P2002") {
            return res.status(409).json({
                success: false,
                message: "That phone number is already in use."
            });
        }

        console.error("Update profile error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while updating your profile."
        });
    }
};


const deleteUserAccount = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        await prisma.user.delete({
            where: { id: req.user.userId }
        });

        return res.status(200).json({
            success: true,
            message: "Your account has been deleted successfully."
        });

    } catch (error) {
        console.error("Delete account error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while deleting your account."
        });
    }
};


const uploadProfileImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please select a profile image to upload."
            });
        }

        const imagePath = `/uploads/${req.file.filename}`;

        const user = await prisma.user.update({
            where: { id: req.user.userId },
            data: {
                profileImage: imagePath
            },
            select: {
                id: true,
                name: true,
                email: true,
                profileImage: true
            }
        });

        return res.status(200).json({
            success: true,
            message: "Profile image uploaded successfully.",
            user
        });

    } catch (error) {
        console.error("Profile image upload error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while uploading your profile image."
        });
    }
};


const getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                isVerified: true,
                profileImage: true,
                createdAt: true,
                updatedAt: true
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return res.status(200).json({
            success: true,
            message: "Users retrieved successfully.",
            count: users.length,
            users
        });

    } catch (error) {
        console.error("Get all users error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while retrieving users."
        });
    }
};


module.exports = { 
    registerUser,
    loginUser,
    getProfile,
    verifyEmail,
    updateUserProfile,
    deleteUserAccount,
    uploadProfileImage,
    getAllUsers
 };