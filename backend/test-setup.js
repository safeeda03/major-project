const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

async function createTestUsers() {
  try {
    await mongoose.connect('mongodb://localhost:27017/poshanai');
    console.log('Connected to MongoDB');
    
    // Clear existing test users
    await User.deleteMany({ phone: /9876543210|9876543211|9876543212/ });
    
    const users = [
      {
        user_id: 'WORKER001',
        name: 'Test Worker',
        phone: '9876543210',
        email: 'anganwadiworker@gmail.com',
        password: 'password123',
        role: 'worker'
      },
      {
        user_id: 'SUP001',
        name: 'Test Supervisor',
        phone: '9876543211',
        email: 'supervisor@gmail.com',
        password: 'password123',
        role: 'supervisor'
      },
      {
        user_id: 'PARENT001',
        name: 'Test Parent',
        phone: '9876543212',
        email: 'fimsha@gmail.com',
        password: 'password123',
        role: 'parent'
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
    console.log('        anganwadiworker@gmail.com / password123');
    console.log('Supervisor: 9876543211 / password123');
    console.log('            supervisor@gmail.com / password123');
    console.log('Parent: 9876543212 / password123');
    console.log('        fimsha@gmail.com / password123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating test users:', error);
    process.exit(1);
  }
}

createTestUsers();
