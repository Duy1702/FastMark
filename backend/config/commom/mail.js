const { getTransporter, isMailConfigured, sendVerificationEmail } = require("../../services/mailService");

module.exports = {
  isMailConfigured,
  sendVerificationEmail,
  getTransporter,
};
