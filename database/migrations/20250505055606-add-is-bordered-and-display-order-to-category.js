/* eslint-env node */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDefinition = await queryInterface.describeTable('categories');

    if (!tableDefinition['is_bordered']) {
      await queryInterface.addColumn('categories', 'is_bordered', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      });
    }

    if (!tableDefinition['display_order']) {
      await queryInterface.addColumn('categories', 'display_order', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const tableDefinition = await queryInterface.describeTable('categories');

    if (tableDefinition['is_bordered']) {
      await queryInterface.removeColumn('categories', 'is_bordered');
    }

    if (tableDefinition['display_order']) {
      await queryInterface.removeColumn('categories', 'display_order');
    }
  },
};
