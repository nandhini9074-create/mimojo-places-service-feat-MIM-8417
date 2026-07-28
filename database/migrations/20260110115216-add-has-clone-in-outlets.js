/* eslint-env node */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('outlets', 'has_clone', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  },

  async down (queryInterface) {
    await queryInterface.removeColumn('outlets', 'has_clone');
  }
};
