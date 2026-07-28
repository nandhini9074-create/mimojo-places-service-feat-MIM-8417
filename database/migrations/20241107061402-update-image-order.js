/* eslint-env node */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('outlet_photos', 'sort_order', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },

  async down (queryInterface) {
    await queryInterface.removeColumn('outlet_photos', 'sort_order');
  }
};
