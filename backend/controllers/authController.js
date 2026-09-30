const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Beneficiary = require('../models/Beneficiary');
const AnganwadiCentre = require('../models/AnganwadiCentre');

const ALLOWED_ROLES = ['worker', 'supervisor', 'parent'];

// Login controller
exports.login = async (req, res) => {
  try {
    const { phone, email, identifier, password } = req.body;
    const loginIdentifier = String(identifier || email || phone || '').trim();
    if (!loginIdentifier || !password) return res.status(400).json({ message: 'Email or phone number and password are required.' });

    // Find user by phone number or email address.
    const user = await User.findOne({
      $or: [
        { phone: loginIdentifier },
        { email: loginIdentifier.toLowerCase() }
      ]
    });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        user_id: user.user_id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        workerId: user.workerId,
        centreId: user.centreId,
        beneficiaryId: user.beneficiaryId
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Logout controller
exports.logout = async (req, res) => {
  try {
    res.json({ message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Register controller
exports.register = async (req, res) => {
  try {
    const { name, phone, email, password, confirmPassword, role } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPhone = String(phone || '').replace(/[\s()-]/g, '');
    const workerId = String(req.body.workerId || '').trim().toUpperCase();
    const centreId = String(req.body.centreId || '').trim().toUpperCase();
    const beneficiaryId = String(req.body.beneficiaryId || '').trim().toUpperCase();

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Role must be worker, supervisor, or parent' });
    }

    if (!String(name || '').trim() || !normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail) || !/^\+?[0-9]{7,15}$/.test(normalizedPhone)) {
      return res.status(400).json({ message: 'Enter your name, a valid email address, and a valid phone number.' });
    }
    if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    if (password !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match.' });

    let centre = null;
    let beneficiary = null;
    if (role === 'worker') {
      if (!centreId) return res.status(400).json({ message: 'Centre ID is required.' });
      centre = await AnganwadiCentre.findOne({ centre_id: centreId });
      if (!centre) return res.status(400).json({ message: 'Invalid Centre ID. Please enter the Centre ID provided by your Supervisor.' });
      if (!workerId || centre.worker_id !== workerId) return res.status(400).json({ message: 'Invalid Anganwadi Worker ID. Please check the ID provided by your Supervisor.' });
      if (await User.exists({ workerId })) return res.status(409).json({ message: 'This Anganwadi Worker ID is already linked to an account.' });
    } else if (role === 'parent') {
      beneficiary = await Beneficiary.findOne({ beneficiary_id: beneficiaryId, beneficiary_type: 'child' });
      if (!beneficiary) return res.status(400).json({ message: 'Invalid Beneficiary ID. Please enter the Beneficiary ID provided by your Anganwadi Worker.' });
      if (await User.exists({ beneficiaryId })) return res.status(409).json({ message: 'This Beneficiary ID is already linked to a parent account.' });
      if (beneficiary.parent_id && await User.exists({ user_id: beneficiary.parent_id, role: 'parent' })) {
        return res.status(409).json({ message: 'This Beneficiary ID is already linked to a parent account.' });
      }
    }

    if (await User.exists({ $or: [{ phone: normalizedPhone }, { email: normalizedEmail }] })) {
      return res.status(409).json({ message: 'An account with this email or phone number already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const userId = `USR-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const user = new User({
      user_id: userId,
      name,
      phone: normalizedPhone,
      email: normalizedEmail,
      password: hashedPassword,
      role,
      ...(role === 'worker' ? { workerId, centreId } : {}),
      ...(role === 'parent' ? { beneficiaryId } : {})
    });

    await user.save();
    if (beneficiary) {
      beneficiary.parent_id = user.user_id;
      await beneficiary.save();
    }

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        workerId: user.workerId,
        centreId: user.centreId,
        beneficiaryId: user.beneficiaryId
      }
    });
  } catch (error) {
    res.status(error.code === 11000 ? 409 : 500).json({ message: error.code === 11000 ? 'This email, phone number, or ID is already linked to an account.' : 'Server error', error: error.message });
  }
};
