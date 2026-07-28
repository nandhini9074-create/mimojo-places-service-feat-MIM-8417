/* eslint-env node */
/* eslint-disable angular/module-getter -- Sequelize migration, not Angular */
require('dotenv').config();

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const mimojoProfileId = process.env.MIMOJO_PROFILE_ID;

    if (!mimojoProfileId) {
      throw new Error('MIMOJO_PROFILE_ID is not set in the environment');
    }

    await queryInterface.addColumn('profiles', 'is_default', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.sequelize.query(`
      UPDATE profiles
      SET "is_default" = true
      WHERE "id" = '${mimojoProfileId}';
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('profiles', 'is_default');
  }
};
