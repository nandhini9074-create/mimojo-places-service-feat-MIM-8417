/* eslint-env node */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface) {
    await queryInterface.sequelize.query(
      'UPDATE outlets SET "fast_payment_status" = \'NOT ENROLLED\' WHERE "fast_payment_status" IS NULL;'
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
