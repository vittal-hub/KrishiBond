require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Faq = require('../models/Faq');

const faqs = [
  { question: 'How do I create a contract?', answer: 'Open a listing or matched buyer and choose "Propose contract".', category: 'contracts' },
  { question: 'How does escrow work?', answer: 'The buyer funds escrow; funds are released to the farmer once milestones are confirmed.', category: 'payments' },
  { question: 'How do I raise a dispute?', answer: 'Open the contract and select "Raise dispute", then describe the issue and attach evidence.', category: 'disputes' },
];

(async () => {
  await connectDB();
  await Faq.deleteMany({});
  await Faq.insertMany(faqs);
  console.log(`Seeded ${faqs.length} FAQs`);
  await mongoose.disconnect();
  process.exit(0);
})();
