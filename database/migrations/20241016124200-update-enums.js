/* eslint-env node */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TYPE "enum_outlets_status" ADD VALUE IF NOT EXISTS \'Not Enrolled\';'
    );
    await queryInterface.sequelize.query(
      'ALTER TYPE "enum_outlets_fast_payment_status" ADD VALUE IF NOT EXISTS \'NOT ENROLLED\';'
    );
    await queryInterface.sequelize.query(
      'ALTER TYPE "enum_outlets_fast_payment_status" ADD VALUE IF NOT EXISTS \'READY\';'
    );
  },

  async down () {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
};
