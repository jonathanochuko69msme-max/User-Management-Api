require("dotenv").config();

const prisma = require("./lib/prisma");

const express = require ("express");

const userRoutes = require("./routes/userRoutes");

const app = express();

app.use(express.json());

app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
    res.status(200).json({
        success: "true",
        message: "User Management API is working successfully"
    });
});

app.get("/db-status", async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;

        res.status(200).json({
            success: true,
            message: "Database connected successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Database connection failed"
        });
    }
});

const PORT = process.env.PORT || 500;

app.listen(PORT, () => {
    console.log(`server is running on port $(PORT) `);    
});

