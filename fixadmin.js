const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function fixAdminUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/arenax");
        console.log('✅ MongoDB connected');

        const User = require('./models/User');

        // Pehle existing admin user delete karo
        await User.deleteMany({ email: "admin@arenax.com" });
        console.log('🗑️ Old admin users deleted');

        // Naya admin user create karo
        const hashedPassword = await bcrypt.hash("admin123", 12);

        const adminUser = new User({
            username: "admin",
            email: "admin@arenax.com", 
            password: hashedPassword,
            phone: "9999999999",
            isAdmin: true,
            walletBalance: 0,
            isActive: true,
            stats: { totalWins: 0, totalEarnings: 0, totalMatches: 0 },
            createdAt: new Date()
        });

        await adminUser.save();
        console.log('🎉 New admin user created!');

        // Verify karo
        const verifiedAdmin = await User.findOne({ email: "admin@arenax.com" });
        console.log('✅ Verification:');
        console.log('Username:', verifiedAdmin.username);
        console.log('Email:', verifiedAdmin.email);
        console.log('isAdmin:', verifiedAdmin.isAdmin);
        console.log('isActive:', verifiedAdmin.isActive);

        console.log('\n📧 Login Credentials:');
        console.log('Email: admin@arenax.com');
        console.log('Password: admin123');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

fixAdminUser();