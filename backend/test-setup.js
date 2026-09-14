const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

async function createTestUsers() {
  try {
    await mongoose.connect('mongodb://localhost:27017/poshanai');
    console.log('Connected to MongoDB');
    
    // Clear existing test users
    await User.deleteMany({ phone: /9876543210|9876543211|9876543212|9876543213/ });
    
    const users = [
      {
        user_id: 'WORKER001',
        name: 'Test Worker',
        phone: '9876543210',
        password: 'password123',
        role: 'worker'
      },
      {
        user_id: 'SUP001',
        name: 'Test Supervisor',
        phone: '9876543211',
        password: 'password123',
        role: 'supervisor'
      },
      {
        user_id: 'PARENT001',
        name: 'Test Parent',
        phone: '9876543212',
        password: 'password123',
        role: 'parent'
      },
      {
        user_id: 'ADMIN001',
        name: 'Test Admin',
        phone: '9876543213',
        password: 'password123',
        role: 'admin'
      }
    ];
    
    for (const userData of users) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = new User({
        ...userData,
        password: hashedPassword
      });
      await user.save();
      console.log(`Created ${userData.role}: ${userData.name} (${userData.phone})`);
    }
    
    console.log('\nTest users created successfully!');
    console.log('Login credentials:');
    console.log('Worker: 9876543210 / password123');
    console.log('Supervisor: 9876543211 / password123');
    console.log('Parent: 9876543212 / password123');
    console.log('Admin: 9876543213 / password123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating test users:', error);
    process.exit(1);
  }
}

createTestUsers();