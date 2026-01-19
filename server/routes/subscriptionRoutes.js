const express = require('express');
const router = express.Router();
const {
    buySubscription,
    verifySubscriptionPayment,
    cancelSubscription,
    renewSubscription,
    verifyRenewal,
    getMySubscription,
    getAllSubscriptions,
    adminCancelSubscription,
    getAvailableUpgrades,
    upgradeSubscription,
    verifyUpgrade
} = require('../controllers/subscriptionController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, buySubscription)
    .get(protect, admin, getAllSubscriptions);

router.put('/:id/cancel', protect, admin, adminCancelSubscription);

router.route('/verify').post(protect, verifySubscriptionPayment);
router.route('/cancel').post(protect, cancelSubscription);
router.route('/renew-init').post(protect, renewSubscription);
router.route('/renew-verify').post(protect, verifyRenewal);
router.route('/me').get(protect, getMySubscription);
router.route('/available-upgrades').get(protect, getAvailableUpgrades);
router.route('/upgrade-init').post(protect, upgradeSubscription);
router.route('/upgrade-verify').post(protect, verifyUpgrade);

module.exports = router;
