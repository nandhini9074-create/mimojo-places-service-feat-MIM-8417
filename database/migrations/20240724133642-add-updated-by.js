/* eslint-env node */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('outlets', 'updated_by', {
      type: Sequelize.UUID,
      allowNull: true,
    });
    await queryInterface.addColumn('categories', 'updated_by', {
      type: Sequelize.UUID,
      allowNull: true,
    });
    await queryInterface.addColumn('filters', 'updated_by', {
      type: Sequelize.UUID,
      allowNull: true,
    });
    await queryInterface.addColumn('outlet_addresses', 'updated_by', {
      type: Sequelize.UUID,
      allowNull: true,
    });
    await queryInterface.addColumn('outlet_filters', 'updated_by', {
      type: Sequelize.UUID,
      allowNull: true,
    });
    await queryInterface.addColumn('outlet_timings', 'updated_by', {
      type: Sequelize.UUID,
      allowNull: true,
    });
    await queryInterface.addColumn('sub_categories', 'updated_by', {
      type: Sequelize.UUID,
      allowNull: true,
    });
  },

  async down (queryInterface) {
    await queryInterface.removeColumn('outlets', 'updated_by');
    await queryInterface.removeColumn('categories', 'updated_by');
    await queryInterface.removeColumn('filters', 'updated_by');
    await queryInterface.removeColumn('outlet_addresses', 'updated_by');
    await queryInterface.removeColumn('outlet_filters', 'updated_by');
    await queryInterface.removeColumn('outlet_timings', 'updated_by');
    await queryInterface.removeColumn('sub_categories', 'updated_by');
  }
};
