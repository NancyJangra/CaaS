const express = require('express');
const authController = require('../controllers/authController');
const { loginRateLimit } = require('../middleware/loginRateLimit');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', loginRateLimit, authController.login);
router.post('/logout', authController.logout);

module.exports = router;
