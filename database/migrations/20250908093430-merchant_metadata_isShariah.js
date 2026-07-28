/* eslint-env node */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('merchant_profile_metadata', 'is_shariah', {
      type: Sequelize.BOOLEAN,
      allowNull: true
    });
  },

  async down (queryInterface) {
    await queryInterface.removeColumn('merchant_profile_metadata', 'is_shariah');
  }
};
