/* eslint-env node */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('outlets', 'mid_pid_relation', {
      type: Sequelize.ARRAY(Sequelize.JSONB),
      allowNull: true,
    });
  },

  async down (queryInterface) {
    await queryInterface.removeColumn('outlets', 'mid_pid_relation');
  }
};
