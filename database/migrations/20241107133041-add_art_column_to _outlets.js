/* eslint-env node */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('outlets', 'art_desc', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: true
    });

    await queryInterface.addColumn('outlets', 'competitor_desc', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: true
    });
  },

  async down (queryInterface, _Sequelize) {
    // Remove the column
    await queryInterface.removeColumn('outlets', 'art_desc');
    await queryInterface.removeColumn('outlets', 'competitor_desc');
  }
};
