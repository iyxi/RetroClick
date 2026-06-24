const bcrypt = require('bcrypt');
const db = require('./models');
const User = db.User;

const createAdminUser = async () => {
    try {
        // Admin credentials
        const adminEmail = 'admin@retroclick.com';
        const adminPassword = 'Admin@123';
        const adminName = 'Admin User';

        // Check if admin already exists
        const existingAdmin = await User.findOne({
            where: { email: adminEmail }
        });

        if (existingAdmin) {
            console.log('Admin user already exists');
            process.exit(0);
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        // Create admin user
        const admin = await User.create({
            name: adminName,
            email: adminEmail,
            password: hashedPassword,
            role: 'admin',
            is_active: true
        });

        console.log('\n✓ Admin account created successfully!\n');
        console.log('Admin Credentials:');
        console.log('==================');
        console.log(`Email:    ${adminEmail}`);
        console.log(`Password: ${adminPassword}`);
        console.log('==================\n');
        console.log('IMPORTANT: Save these credentials in a secure location.');
        console.log('You can change the password after first login.\n');

        process.exit(0);
    } catch (error) {
        console.error('Error creating admin user:', error.message);
        process.exit(1);
    }
};

createAdminUser();
