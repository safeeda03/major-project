const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models
const User = require('./models/User');
const Beneficiary = require('./models/Beneficiary');
const HealthRecord = require('./models/HealthRecord');
const NutritionRecord = require('./models/NutritionRecord');
const Vaccination = require('./models/Vaccination');
const Attendance = require('./models/Attendance');
const AnganwadiCentre = require('./models/AnganwadiCentre');

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/poshanai', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected for seeding'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Seed data
const seedData = async () => {
  try {
    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Beneficiary.deleteMany({});
    await HealthRecord.deleteMany({});
    await NutritionRecord.deleteMany({});
    await Vaccination.deleteMany({});
    await Attendance.deleteMany({});
    await AnganwadiCentre.deleteMany({});

    // Create Anganwadi Centres
    console.log('Creating Anganwadi Centres...');
    const centres = await AnganwadiCentre.create([
      {
        centre_id: 'ANG001',
        name: 'Anganwadi Centre A',
        latitude: 28.6139,
        longitude: 77.2090,
        address: 'Sector 1, New Delhi'
      },
      {
        centre_id: 'ANG002',
        name: 'Anganwadi Centre B',
        latitude: 28.6150,
        longitude: 77.2100,
        address: 'Sector 2, New Delhi'
      },
      {
        centre_id: 'ANG003',
        name: 'Anganwadi Centre C',
        latitude: 28.6170,
        longitude: 77.2080,
        address: 'Sector 3, New Delhi'
      }
    ]);

    // Create Users
    console.log('Creating Users...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const users = await User.create([
      {
        user_id: 'USR001',
        name: 'Rajesh Kumar',
        phone: '9876543210',
        password: hashedPassword,
        role: 'worker'
      },
      {
        user_id: 'USR002',
        name: 'Sunita Devi',
        phone: '9876543211',
        password: hashedPassword,
        role: 'supervisor'
      },
      {
        user_id: 'USR003',
        name: 'Amit Sharma',
        phone: '9876543212',
        password: hashedPassword,
        role: 'parent'
      },
      {
        user_id: 'USR004',
        name: 'Admin User',
        phone: '9876543213',
        password: hashedPassword,
        role: 'admin'
      }
    ]);

    // Create Beneficiaries
    console.log('Creating Beneficiaries...');
    const beneficiaries = await Beneficiary.create([
      {
        beneficiary_id: 'BEN001',
        name: 'Rahul Kumar',
        dob: new Date('2023-01-15'),
        gender: 'male',
        parent_id: 'USR010',
        anganwadi_id: 'ANG001'
      },
      {
        beneficiary_id: 'BEN002',
        name: 'Priya Singh',
        dob: new Date('2022-06-20'),
        gender: 'female',
        parent_id: 'USR011',
        anganwadi_id: 'ANG001'
      },
      {
        beneficiary_id: 'BEN003',
        name: 'Amit Verma',
        dob: new Date('2021-11-10'),
        gender: 'male',
        parent_id: 'USR012',
        anganwadi_id: 'ANG002'
      },
      {
        beneficiary_id: 'BEN004',
        name: 'Sneha Gupta',
        dob: new Date('2020-03-25'),
        gender: 'female',
        parent_id: 'USR013',
        anganwadi_id: 'ANG002'
      },
      {
        beneficiary_id: 'BEN005',
        name: 'Vikram Patel',
        dob: new Date('2019-08-12'),
        gender: 'male',
        parent_id: 'USR003',
        anganwadi_id: 'ANG003'
      }
    ]);

    // Create Health Records
    console.log('Creating Health Records...');
    const healthRecords = await HealthRecord.create([
      {
        beneficiary_id: 'BEN001',
        height: 75,
        weight: 9.5,
        bmi: 16.89,
        health_status: 'normal',
        date: new Date('2024-01-15')
      },
      {
        beneficiary_id: 'BEN002',
        height: 82,
        weight: 11.2,
        bmi: 16.66,
        health_status: 'normal',
        date: new Date('2024-01-15')
      },
      {
        beneficiary_id: 'BEN003',
        height: 88,
        weight: 12.8,
        bmi: 16.53,
        health_status: 'normal',
        date: new Date('2024-01-15')
      }
    ]);

    // Create Nutrition Records
    console.log('Creating Nutrition Records...');
    const nutritionRecords = await NutritionRecord.create([
      {
        beneficiary_id: 'BEN001',
        nutrition_status: 'normal',
        meals: 'Breakfast: Milk with porridge, Lunch: Rice with dal, Snack: Fruit',
        recommendations: 'Continue current diet. Ensure adequate protein intake.',
        date: new Date('2024-01-15')
      },
      {
        beneficiary_id: 'BEN002',
        nutrition_status: 'normal',
        meals: 'Breakfast: Milk with cereal, Lunch: Khichdi, Snack: Banana',
        recommendations: 'Include iron-rich foods like spinach in meals.',
        date: new Date('2024-01-15')
      },
      {
        beneficiary_id: 'BEN003',
        nutrition_status: 'underweight',
        meals: 'Breakfast: Milk with bread, Lunch: Rice, Snack: Biscuit',
        recommendations: 'Increase calorie intake. Add healthy fats like ghee.',
        date: new Date('2024-01-15')
      }
    ]);

    // Create Vaccination Records
    console.log('Creating Vaccination Records...');
    const vaccinations = await Vaccination.create([
      {
        beneficiary_id: 'BEN001',
        vaccine: 'BCG',
        date: new Date('2023-01-20'),
        next_due_date: new Date('2023-08-20')
      },
      {
        beneficiary_id: 'BEN001',
        vaccine: 'Polio',
        date: new Date('2023-02-20'),
        next_due_date: new Date('2023-03-20')
      },
      {
        beneficiary_id: 'BEN002',
        vaccine: 'BCG',
        date: new Date('2022-06-25'),
        next_due_date: new Date('2023-01-25')
      },
      {
        beneficiary_id: 'BEN003',
        vaccine: 'BCG',
        date: new Date('2021-11-15'),
        next_due_date: new Date('2022-06-15')
      }
    ]);

    // Create Attendance Records
    console.log('Creating Attendance Records...');
    const today = new Date();
    const attendance = await Attendance.create([
      {
        beneficiary_id: 'BEN001',
        date: today,
        status: 'present'
      },
      {
        beneficiary_id: 'BEN002',
        date: today,
        status: 'present'
      },
      {
        beneficiary_id: 'BEN003',
        date: today,
        status: 'absent'
      },
      {
        beneficiary_id: 'BEN004',
        date: today,
        status: 'present'
      },
      {
        beneficiary_id: 'BEN005',
        date: today,
        status: 'half-day'
      }
    ]);

    console.log('Seed data created successfully!');
    console.log('\nCreated:');
    console.log(`- ${centres.length} Anganwadi Centres`);
    console.log(`- ${users.length} Users`);
    console.log(`- ${beneficiaries.length} Beneficiaries`);
    console.log(`- ${healthRecords.length} Health Records`);
    console.log(`- ${nutritionRecords.length} Nutrition Records`);
    console.log(`- ${vaccinations.length} Vaccination Records`);
    console.log(`- ${attendance.length} Attendance Records`);
    
    console.log('\nTest Login Credentials:');
    console.log('Worker: 9876543210 / password123');
    console.log('Supervisor: 9876543211 / password123');
    console.log('Parent: 9876543212 / password123');
    console.log('Admin: 9876543213 / password123');

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    mongoose.disconnect();
  }
};

// Run seed
seedData();
