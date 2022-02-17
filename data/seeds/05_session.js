/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
 exports.seed = function (knex) {
  // Deletes ALL existing entries
  return knex("session").del();
};
