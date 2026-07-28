/* eslint-env node */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('outlets', 'name_ar', {
      type: Sequelize.STRING,
      allowNull: true,
    })
    await queryInterface.addColumn('outlets', 'merchant_name_ar', {
      type: Sequelize.STRING,
      allowNull: true,
    })
    await queryInterface.addColumn('outlets', 'menu_url_ar', {
      type: Sequelize.STRING,
      allowNull: true,
    })
    await queryInterface.addColumn('outlets', 'booking_url_ar', {
      type: Sequelize.STRING,
      allowNull: true,
    })
    await queryInterface.addColumn('outlets', 'website_ar', {
      type: Sequelize.STRING,
      allowNull: true,
    })
    await queryInterface.addColumn('outlets', 'description_ar', {
      type: Sequelize.STRING,
      allowNull: true,
    })
    await queryInterface.addColumn('outlet_timings', 'weekday_text_ar', {
      type: Sequelize.ARRAY(Sequelize.JSONB),
      allowNull: true,
    })
    await queryInterface.addColumn('outlet_addresses', 'location_ar', {
      type: Sequelize.STRING,
      allowNull: true,
    })
    await queryInterface.addColumn('outlet_addresses', 'formatted_address_ar', {
      type: Sequelize.STRING,
      allowNull: true,
    })
    await queryInterface.addColumn('neighbourhoods', 'neighbourhood_name_ar', {
      type: Sequelize.STRING,
      allowNull: true,
    })
    await queryInterface.addColumn('areas', 'area_name_ar', {
      type: Sequelize.STRING,
      allowNull: true,
    })
    await queryInterface.addColumn('filters', 'name_ar', {
      type: Sequelize.STRING,
      allowNull: true,
    })
    await queryInterface.addColumn('sub_categories', 'name_ar', {
      type: Sequelize.STRING,
      allowNull: true,
    })
    await queryInterface.addColumn('sub_categories', 'type_ar', {
      type: Sequelize.STRING,
      allowNull: true,
    })
    await queryInterface.addColumn('categories', 'name_ar', {
      type: Sequelize.STRING,
      allowNull: true,
    })
  },

  async down (queryInterface) {
    await queryInterface.removeColumn('outlets', 'name_ar');
    await queryInterface.removeColumn('outlets', 'merchant_name_ar');
    await queryInterface.removeColumn('outlets', 'menu_url_ar');
    await queryInterface.removeColumn('outlets', 'booking_url_ar');
    await queryInterface.removeColumn('outlets', 'website_ar');
    await queryInterface.removeColumn('outlets', 'description_ar');
    await queryInterface.removeColumn('outlet_timings', 'weekday_text_ar');
    await queryInterface.removeColumn('outlet_addresses', 'location_ar');
    await queryInterface.removeColumn('outlet_addresses', 'formatted_address_ar');
    await queryInterface.removeColumn('neighbourhoods', 'neighbourhood_name_ar');
    await queryInterface.removeColumn('areas', 'area_name_ar');
    await queryInterface.removeColumn('filters', 'name_ar');
    await queryInterface.removeColumn('sub_categories', 'name_ar');
    await queryInterface.removeColumn('sub_categories', 'type_ar');
    await queryInterface.removeColumn('categories', 'name_ar');
  }
};
