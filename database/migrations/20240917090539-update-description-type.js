/* eslint-env node */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('outlets', 'description_ar', {
      type: Sequelize.TEXT
  });
  },
};
