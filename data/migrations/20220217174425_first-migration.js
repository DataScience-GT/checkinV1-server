exports.up = (knex) => {
  return knex.schema
    .createTable("api_keys", function (table) {
      table.increments("id").primary();
      table.string("name", 255);
      table.string("prefix", 255);
      table.string("key", 255);
      table.string("scopes", 255);
    })
    .createTable("events", function (table) {
      table.increments("eventId").primary();
      table.string("identifier", 255).notNullable().unique();
      table.string("name", 255);
      table.string("description", 255);
      table.integer("status", 255).defaultTo(0);
    })
    .createTable("login", function (table) {
      table.increments("id").primary();
      table.string("type", 255);
      table.string("username", 255).unique().notNullable();
      table.string("password", 255);
    })
    .createTable("users", function (table) {
      table.integer("barcodeNum", 255).unique().notNullable();
      table.string("name", 255);
      table.string("email", 255);
    })
    .createTable("session", function (table) {
      table.increments("id").primary();
      table.string("type", 255);
      table.string("token", 255).unique().notNullable();
      table.string("expires", 255);
      table.string("username", 255);
    })
    .createTable("checkin-template", function (table) {
      table.integer("barcodeNum", 255).unique();
      table.integer("attended", 255).notNullable().defaultTo(0);
      table.string("lastModified", 255);
      table.string("modifiedBy", 255);
    });
};

exports.down = (knex) => {
  return knex.schema
    .dropTableIfExists("profiles")
    .dropTableIfExists("api_keys")
    .dropTableIfExists("events")
    .dropTableIfExists("login")
    .dropTableIfExists("users")
    .dropTableIfExists("session")
    .dropTableIfExists("checkin-template");
};
