const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const multer = require('multer');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use('/uploads', express.static('uploads'));

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

// Create uploads directory if not exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// ✅ IMPORT YOUR EXISTING USER MODEL FROM AUTH SYSTEM
const User = require("./models/User");

// Import Routes
const authRoutes = require("./routes/auth");
const tournamentRoutes = require("./routes/tournaments");
const walletRoutes = require("./routes/wallet"); // ✅ WALLET ROUTES ADDED
const userRoutes = require("./routes/user");
const adminRoutes = require("./routes/admin");

// Use Routes
app.use("/api/auth", authRoutes);
app.use("/api/tournaments", tournamentRoutes);
app.use("/api/wallet", walletRoutes); // ✅ WALLET ROUTES ADDED
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);

// Gmail Transporter Setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
    }
});

// ✅ TEMPORARY TOKEN STORAGE
let tempTokenStorage = new Map();

// ✅ FORGOT PASSWORD (AAPKE EXISTING USER MODEL KE SAATH)
app.post("/api/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        
        console.log('📧 Forgot Password Request for:', email);
        
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format"
            });
        }

        // ✅ AAPKE EXISTING USER MODEL USE KARO
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            console.log('❌ User not found in database');
            // Security ke liye success message hi bhejo
            return res.json({
                success: true,
                message: "If email exists, reset link will be sent to your email"
            });
        }

        console.log('✅ User found:', user.email);

        // Generate token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = Date.now() + 2 * 60 * 1000; // 2 minutes
        
        // Store token with user info
        tempTokenStorage.set(resetToken, {
            email: user.email,
            userId: user._id.toString(),
            expires: tokenExpiry
        });
        
        console.log('🔐 Token generated for:', user.email);
        console.log('💾 Tokens in storage:', tempTokenStorage.size);

        // Create reset URL
        const resetUrl = `http://localhost:3000/reset-password.html?token=${resetToken}`;

        // Send email
        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: email,
            subject: 'Password Reset Request - ArenaX',
            html: `
                <div style="font-family: Arial, sans-serif;">
                    <h2>Password Reset Request</h2>
                    <p>You requested to reset your password. Click the button below:</p>
                    <a href="${resetUrl}" 
                       style="background-color: #007bff; color: white; padding: 12px 24px; 
                              text-decoration: none; border-radius: 5px; display: inline-block;">
                        Reset Password
                    </a>
                    <p style="color: #666; margin-top: 20px;">
                        This link expires in 2 minutes.
                    </p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('📧 Reset email sent to:', email);

        res.json({
            success: true,
            message: "Password reset link has been sent to your email. Link expires in 2 minutes."
        });

    } catch (error) {
        console.error('❌ Forgot Password Error:', error);
        res.status(500).json({
            success: false,
            message: "Server error: " + error.message
        });
    }
});

// ✅ RESET PASSWORD (AAPKE EXISTING USER MODEL KE SAATH)
app.post("/api/reset-password", async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        console.log('🔄 Reset Password Request Received');
        console.log('Token length:', token?.length);
        console.log('New password length:', newPassword?.length);

        // Validation
        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Reset token is required"
            });
        }

        if (!newPassword) {
            return res.status(400).json({
                success: false,
                message: "New password is required"
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long"
            });
        }

        // Check token in temporary storage
        const tokenData = tempTokenStorage.get(token);
        
        if (!tokenData) {
            console.log('❌ Token not found in storage');
            return res.status(400).json({
                success: false,
                message: "Invalid or expired reset token"
            });
        }

        if (tokenData.expires < Date.now()) {
            console.log('❌ Token expired');
            tempTokenStorage.delete(token);
            return res.status(400).json({
                success: false,
                message: "Reset token has expired. Please request a new link."
            });
        }

        console.log('✅ Valid token found for user:', tokenData.email);
        
        // ✅ AAPKE EXISTING USER MODEL SE USER KO FIND KARO
        const user = await User.findById(tokenData.userId);
        
        if (!user) {
            console.log('❌ User not found with ID:', tokenData.userId);
            return res.status(400).json({
                success: false,
                message: "User not found"
            });
        }

        console.log('👤 User found for password update:', user.email);

        // ✅ ACTUAL PASSWORD UPDATE - AAPKE EXISTING SYSTEM KE SAATH
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        
        // Direct assignment and save
        user.password = hashedPassword;
        await user.save();
        
        console.log('✅ Password successfully updated for:', user.email);

        // Clean up
        tempTokenStorage.delete(token);

        res.json({
            success: true,
            message: "Password has been reset successfully. You can now login with your new password."
        });

    } catch ( error) {
        console.error('❌ Reset Password Error:', error);
        res.status(500).json({
            success: false,
            message: "Server error during password reset: " + error.message
        });
    }
});

// ✅ DEBUG ENDPOINT
app.get("/api/debug-tokens", (req, res) => {
    const tokens = Array.from(tempTokenStorage.entries()).map(([token, data]) => ({
        tokenPreview: token.substring(0, 20) + '...',
        email: data.email,
        userId: data.userId,
        expires: new Date(data.expires).toLocaleString(),
        isValid: data.expires > Date.now()
    }));
    
    res.json({
        success: true,
        totalTokens: tempTokenStorage.size,
        tokens: tokens,
        currentTime: new Date().toLocaleString()
    });
});

// ✅ CLEAR ALL TOKENS
app.delete("/api/debug-clear-tokens", (req, res) => {
    const previousSize = tempTokenStorage.size;
    tempTokenStorage.clear();
    
    res.json({
        success: true,
        message: `Cleared ${previousSize} tokens`,
        currentSize: tempTokenStorage.size
    });
});

// Clean up expired tokens every minute
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    
    tempTokenStorage.forEach((data, token) => {
        if (data.expires < now) {
            tempTokenStorage.delete(token);
            cleaned++;
        }
    });
    
    if (cleaned > 0) {
        console.log(`🧹 Cleaned ${cleaned} expired tokens`);
    }
}, 60000);

// Root endpoint
app.get("/", (req, res) => {
  res.send("🎮 ArenaX Esports Platform Backend is Running 🚀");
});

// Database connection
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/esports", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log("✅ MongoDB Connected Successfully");
    
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`🔐 Password Reset System: ACTIVE`);
        console.log(`💰 Wallet System: ACTIVE`);
        console.log(`🐛 Debug: http://localhost:${PORT}/api/debug-tokens`);
    });
})
.catch((err) => {
    console.error("❌ MongoDB Connection Failed:", err.message);
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});