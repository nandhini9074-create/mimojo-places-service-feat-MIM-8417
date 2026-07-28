/* eslint-env node */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('outlet_profile_mappings', 'allowed_bins', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('outlet_profile_mappings', 'allowed_bins');
  }
};
