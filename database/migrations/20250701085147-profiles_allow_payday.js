/* eslint-env node */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('profiles', 'allow_payday', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      });
    await queryInterface.sequelize.query(
      'UPDATE profiles SET "allow_payday" = true WHERE "id" != \'a154a1d8-c6f5-47af-a14d-11052271c3e7\';'
    );
    await queryInterface.sequelize.query(
      'UPDATE profiles SET "allow_payday" = false WHERE "id" = \'a154a1d8-c6f5-47af-a14d-11052271c3e7\';'
    );
  },

  async down (queryInterface) {
    await queryInterface.removeColumn('profiles', 'allow_payday');
  }
};
