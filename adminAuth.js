const jwt = require('jsonwebtoken');
const User = require('../models/User');

const adminAuth = async (req, res, next) => {
    try {
        console.log('🔐 Admin Auth Middleware Called');
        
        const token = req.header('Authorization')?.replace('Bearer ', '');
        console.log('Token received:', token ? 'Yes' : 'No');
        
        if (!token) {
            console.log('❌ No token provided');
            return res.status(401).json({
                success: false,
                message: 'No token provided, access denied'
            });
        }

        // Token verify karo
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        console.log('Decoded token:', decoded);
        
        // User find karo - different ID fields check karo
        const user = await User.findById(decoded.userId || decoded.id);
        console.log('User found:', user ? user.email : 'No user found');
        
        if (!user) {
            console.log('❌ User not found');
            return res.status(401).json({
                success: false,
                message: 'User not found, access denied'
            });
        }

        if (!user.isAdmin) {
            console.log('❌ User is not admin');
            return res.status(401).json({
                success: false,
                message: 'Admin access required, access denied'
            });
        }

        console.log('✅ Admin authentication successful:', user.email);
        req.user = user;
        next();
        
    } catch (error) {
        console.log('❌ Auth error:', error.message);
        res.status(401).json({
            success: false,
            message: 'Token is not valid, access denied'
        });
    }
};

module.exports = adminAuth;