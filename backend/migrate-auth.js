const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');
const Beneficiary = require('./models/Beneficiary');
const AnganwadiCentre = require('./models/AnganwadiCentre');

const normalizePhone = (value) => String(value || '').replace(/[\s()-]/g, '');

async function migrateAuthLinks() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/poshanai');
  let linkedWorkers = 0;
  let linkedParents = 0;

  const workers = await User.find({ role: 'worker' });
  for (const worker of workers) {
    if (worker.centreId && worker.workerId) continue;
    const centre = await AnganwadiCentre.findOne({ worker_phone: normalizePhone(worker.phone) });
    if (!centre) continue;
    if (!centre.worker_id) {
      const suffix = String(centre.centre_id || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
      centre.worker_id = `AWW-${suffix}`;
      await centre.save();
    }
    worker.centreId = worker.centreId || centre.centre_id;
    worker.workerId = worker.workerId || centre.worker_id;
    await worker.save();
    linkedWorkers += 1;
  }

  const parents = await User.find({ role: 'parent', $or: [{ beneficiaryId: { $exists: false } }, { beneficiaryId: '' }] });
  for (const parent of parents) {
    const children = await Beneficiary.find({ parent_id: parent.user_id, beneficiary_type: 'child' }).limit(2);
    if (children.length !== 1) continue;
    parent.beneficiaryId = children[0].beneficiary_id;
    await parent.save();
    linkedParents += 1;
  }

  console.log(`Authentication links migrated: ${linkedWorkers} worker(s), ${linkedParents} parent(s).`);
  console.log('Supervisor accounts require no centre or beneficiary links.');
}

migrateAuthLinks().catch((error) => {
  console.error('Could not migrate authentication links:', error.message);
  process.exitCode = 1;
}).finally(async () => {
  await mongoose.disconnect();
});
