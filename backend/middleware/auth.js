const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Beneficiary = require('../models/Beneficiary');

exports.authenticate = async (req, res, next) => {
  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ message: 'Please log in to continue.' });
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(payload.userId).select('-password').lean();
    if (!user) return res.status(401).json({ message: 'Account not found. Please log in again.' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Your session is invalid or has expired. Please log in again.' });
  }
};

exports.requireRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ message: 'You are not allowed to perform this action.' });
  next();
};

exports.getScopedBeneficiaryIds = async (user) => {
  if (user.role === 'supervisor') return null;
  if (user.role === 'worker' && !user.centreId) return [];
  if (user.role === 'parent' && !user.beneficiaryId) return [];
  const filter = user.role === 'worker'
    ? { anganwadi_id: user.centreId }
    : { beneficiary_id: user.beneficiaryId };
  const beneficiaries = await Beneficiary.find(filter).select('beneficiary_id').lean();
  return beneficiaries.map((beneficiary) => beneficiary.beneficiary_id);
};

exports.canAccessBeneficiary = (user, beneficiary) => {
  if (!user || !beneficiary) return false;
  if (user.role === 'supervisor') return true;
  if (user.role === 'worker') return Boolean(user.centreId && beneficiary.anganwadi_id === user.centreId);
  return Boolean(user.beneficiaryId && beneficiary.beneficiary_id === user.beneficiaryId);
};

exports.authorizeBeneficiaryParam = (paramName = 'beneficiaryId') => async (req, res, next) => {
  try {
    const beneficiary = await Beneficiary.findOne({ beneficiary_id: req.params[paramName] }).select('beneficiary_id anganwadi_id');
    if (!exports.canAccessBeneficiary(req.user, beneficiary)) return res.status(403).json({ message: 'You cannot access records for this beneficiary.' });
    next();
  } catch (error) {
    res.status(500).json({ message: 'Could not verify beneficiary access.', error: error.message });
  }
};

exports.authorizeRecord = (Model) => async (req, res, next) => {
  try {
    const record = await Model.findById(req.params.id).select('beneficiary_id');
    if (!record) return res.status(404).json({ message: 'Record not found.' });
    const beneficiary = await Beneficiary.findOne({ beneficiary_id: record.beneficiary_id }).select('beneficiary_id anganwadi_id');
    if (!exports.canAccessBeneficiary(req.user, beneficiary)) return res.status(403).json({ message: 'You cannot access records for this beneficiary.' });
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid record ID.', error: error.message });
  }
};
