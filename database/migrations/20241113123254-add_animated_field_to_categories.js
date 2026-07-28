/* eslint-env node */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('categories', 'dark_image_url', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addColumn('categories', 'is_animated', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addColumn('categories', 'is_new_category', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: null
    });
  },

  async down (queryInterface) {
    await queryInterface.removeColumn('categories', 'dark_image_url');
    await queryInterface.removeColumn('categories', 'is_animated');
    await queryInterface.removeColumn('categories', 'is_new_category');
  }
};
