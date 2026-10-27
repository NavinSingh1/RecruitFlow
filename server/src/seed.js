require('dotenv').config();
const mongoose = require('mongoose');
const Organization = require('./models/Organization');
const User = require('./models/User');
const Job = require('./models/Job');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([Organization.deleteMany(), User.deleteMany(), Job.deleteMany()]);
  const org = await Organization.create({ name: 'Acme Corp' });
  const admin = await User.create({ name: 'Ava Admin', email: 'admin@recruitflow.com', password: 'Admin@123', role: 'admin', organization: org._id });
  await User.create({ name: 'Ray Recruiter', email: 'recruiter@recruitflow.com', password: 'Recruiter@123', role: 'recruiter', organization: org._id });
  await User.create({ name: 'Cara Candidate', email: 'candidate@recruitflow.com', password: 'Candidate@123', role: 'candidate' });
  const base = { organization: org._id, createdBy: admin._id };
  await Job.insertMany([
    { ...base, title: 'Senior React Developer', description: 'Build our hiring dashboard with React and Tailwind.', location: 'Remote', type: 'full-time', skills: ['React', 'Tailwind'], salary: '$90k–$120k', status: 'published' },
    { ...base, title: 'Node.js Backend Engineer', description: 'Design REST APIs and MongoDB schemas.', location: 'Bengaluru', type: 'full-time', skills: ['Node.js', 'MongoDB'], status: 'published' },
    { ...base, title: 'Product Design Intern', description: 'Help shape the candidate experience.', location: 'Remote', type: 'internship', skills: ['Figma'], status: 'draft' },
  ]);
  console.log('Seeded. Logins are listed in the README.');
  process.exit(0);
})();
