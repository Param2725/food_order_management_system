const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

// Import models
const User = require('./models/User');
const Plan = require('./models/Plan');
const Menu = require('./models/Menu');
const Subscription = require('./models/Subscription');
const Order = require('./models/Order');
const Complaint = require('./models/Complaint');
const EventItem = require('./models/EventItem');

const importData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        const filePath = path.join(__dirname, 'database_export.json');
        if (!fs.existsSync(filePath)) {
            console.error('database_export.json not found!');
            process.exit(1);
        }

        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        // Clear existing data
        console.log('Clearing existing data...');
        await User.deleteMany({});
        await Plan.deleteMany({});
        await Menu.deleteMany({});
        await Subscription.deleteMany({});
        await Order.deleteMany({});
        await Complaint.deleteMany({});
        await EventItem.deleteMany({});
        console.log('Existing data cleared');

        // Import new data
        console.log('Importing new data...');
        if (data.users && data.users.length > 0) await User.insertMany(data.users);
        if (data.plans && data.plans.length > 0) await Plan.insertMany(data.plans);
        if (data.menus && data.menus.length > 0) await Menu.insertMany(data.menus);
        if (data.subscriptions && data.subscriptions.length > 0) await Subscription.insertMany(data.subscriptions);
        if (data.orders && data.orders.length > 0) await Order.insertMany(data.orders);
        if (data.complaints && data.complaints.length > 0) await Complaint.insertMany(data.complaints);
        if (data.eventItems && data.eventItems.length > 0) await EventItem.insertMany(data.eventItems);

        console.log('Data imported successfully!');

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

importData();
