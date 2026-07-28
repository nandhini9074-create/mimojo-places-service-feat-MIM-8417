/* eslint-env node */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('outlets', 'fast_payment_status', {
      type: Sequelize.ENUM('PENDING', 'ACTIVE', 'DISABLED'),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('outlets', 'fast_payment_status');
  },
};
