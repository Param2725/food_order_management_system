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

const exportData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        const data = {
            users: await User.find({}),
            plans: await Plan.find({}),
            menus: await Menu.find({}),
            subscriptions: await Subscription.find({}),
            orders: await Order.find({}),
            complaints: await Complaint.find({}),
            eventItems: await EventItem.find({})
        };

        fs.writeFileSync(path.join(__dirname, 'database_export.json'), JSON.stringify(data, null, 2));
        console.log('Data exported to database_export.json');

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

exportData();
