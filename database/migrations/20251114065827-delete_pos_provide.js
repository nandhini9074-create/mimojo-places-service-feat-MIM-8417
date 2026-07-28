/* eslint-env node */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.removeColumn('merchants', 'pos_provider');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('merchants', 'pos_provider', {
      type: Sequelize.ENUM('INFRASYS'),
      allowNull: true,
    });
  },
};
