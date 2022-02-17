/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = function (knex) {
  // Deletes ALL existing entries
  return knex("api_keys")
    .del()
    .then(function () {
      // Inserts seed entries
      return knex("api_keys").insert([
        {
          key: "3dcf00d80e90468723b097f23cefc2f2",
          name: "Master",
          prefix: "e3b3a69",
          scopes: "*",
        },
        {
          key: "e134a3f98298bee3095eb3ed3083b26e",
          name: "Admin",
          prefix: "7f51d72",
          scopes:
            "user.email,account.create,account.login,account.session,event.list,event.checkedin,user.create,user.list,event.checkin,event.status,event.create,event.update,event.uncheckin,user.update",
        },
        {
          key: "bd8373b8bb67c9c27bda21df97be47cc",
          name: "Moderator",
          prefix: "fae3c43",
          scopes:
            "account.create,account.login,account.session,event.list,event.checkedin,user.create,user.list,event.checkin,event.status",
        },
        {
          key: "c5c493071d44251344e9d16f141b8c37",
          name: "Default",
          prefix: "b37234a",
          scopes: "account.login,account.session,event.list,event.checkedin",
        },
      ]);
    });
};
