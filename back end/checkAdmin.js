const db = require('./models');
const User = db.User;

const checkAdmin = async () => {
    try {
        const admin = await User.findOne({
            where: { email: 'admin@retroclick.com' }
        });

        if (admin) {
            console.log('\n✓ Admin user found in database:');
            console.log('==================');
            console.log(`ID: ${admin.id}`);
            console.log(`Email: ${admin.email}`);
            console.log(`Name: ${admin.name}`);
            console.log(`Role: ${admin.role}`);
            console.log(`Active: ${admin.is_active}`);
            console.log('==================\n');
        } else {
            console.log('\n✗ Admin user NOT found in database');
            console.log('You may need to run createAdmin.js again\n');
        }

        process.exit(0);
    } catch (error) {
        console.error('Database error:', error.message);
        process.exit(1);
    }
};

checkAdmin();
