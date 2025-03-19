"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("Users", "role", {
      type: Sequelize.ENUM("admin", "user"),
      allowNull: false,
      defaultValue: "user",
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("Users", "role");
  },
};
