const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createAdminUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/arenax", {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('✅ MongoDB connected');

        const User = require('./models/User');

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: "admin@arenax.com" });
        if (existingAdmin) {
            console.log('⚠️ Admin user already exists');
            console.log('Please login with:');
            console.log('Email: admin@arenax.com');
            console.log('Password: admin123');
            process.exit(0);
        }

        // Create new admin user
        const hashedPassword = await bcrypt.hash("admin123", 12);

        const adminUser = new User({
            username: "admin",
            email: "admin@arenax.com",
            password: hashedPassword,
            phone: "9999999999",
            isAdmin: true,
            walletBalance: 0,
            isActive: true,
            stats: {
                totalWins: 0,
                totalEarnings: 0,
                totalMatches: 0
            }
        });

        await adminUser.save();
        
        console.log('🎉 Admin user created successfully!');
        console.log('📧 Email: admin@arenax.com');
        console.log('🔑 Password: admin123');
        console.log('💻 Login: http://localhost:3000/admin-login.html');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error creating admin user:', error.message);
        process.exit(1);
    }
}

createAdminUser();