/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = function (knex) {
  // Deletes ALL existing entries
  return knex("login")
    .del()
    .then(function () {
      // Inserts seed entries
      return knex("login").insert([
        {
          password: "f9f1239c659dd4deebb9a4cbd1fcff1b",
          type: "master",
          username: "JohnRamberger",
        },
      ]);
    });
};
