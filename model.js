const db = require("./data/db-config");

const selectScopes = (key) => {
  return db.select("scopes").from("api_keys").where("key", key);
};

const selectKeys = (key) => {
  return db("api_keys");
};

const insertKey = (name, prefix, key, scopes) => {
  return db
    .insert({ name: name, prefix: prefix, key: key, scopes: scopes })
    .into("api_keys");
};

const selectEvents = () => {
  return db("events");
};

const insertEvent = (identifier, name, description, status) => {
  return db
    .insert({
      identifier: identifier,
      name: name,
      description: description,
      status: status,
    })
    .into("events");
};

const createEventTable = (identifier) => {
  return db.schema
    .dropTableIfExists(`event_${identifier}`)
    .createTable(`event_${identifier}`, function (table) {
      table.bigInteger("barcodeNum", 255).unique();
      table.integer("attended", 255).notNullable().defaultTo(0);
      table.string("modifiedBy", 255);
      table.timestamps(true, true);
    });
};

const updateEvent = (identifier, name, description, status) => {
  return db
    .update({
      name: name,
      description: description,
      status: status,
    })
    .where("identifier", identifier)
    .from("events");
};

const selectUsers = () => {
  return db("users");
};

const insertUser = (barcodeNum, name, email) => {
  return db
    .insert({
      barcodeNum: barcodeNum,
      name: name,
      email: email,
    })
    .into("users");
};

const updateUser = (barcodeNum, name, email) => {
  return db
    .update({
      name: name,
      email: email,
    })
    .where("barcodeNum", barcodeNum)
    .from("users");
};

const selectEventsCount = (identifier) => {
  return db
    .select(db.raw("COUNT(*) AS count"))
    .from("events")
    .where("identifier", identifier);
};

const selectEventsStatus = (identifier) => {
  return db.select("status").from("events").where("identifier", identifier);
};

const selectUserCheckedInExists = (identifier, barcodeNum) => {
  return db
    .select(db.raw("COUNT(*) AS count"))
    .from(`event_${identifier}`)
    .where("barcodeNum", barcodeNum);
};

const selectUserCheckedIn = (identifier, barcodeNum) => {
  return db
    .select(db.raw("COUNT(*) AS count"))
    .from(`event_${identifier}`)
    .where("barcodeNum", barcodeNum)
    .andWhere("attended", 1);
};

const updateUserCheckIn = (identifier, barcodeNum, attended, modifiedBy) => {
  return db
    .update({
      attended: attended,
      modifiedBy: modifiedBy,
    })
    .where("barcodeNum", barcodeNum)
    .from(`event_${identifier}`);
};

const selectUserExists = (barcodeNum) => {
  return db
    .select(db.raw("COUNT(*) AS count"))
    .from("users")
    .where("barcodeNum", barcodeNum);
};

const checkinUser = (identifier, barcodeNum, attended, modifiedBy) => {
  return db
    .insert({
      barcodeNum: barcodeNum,
      attended: attended,
      modifiedBy: modifiedBy,
    })
    .into(`event_${identifier}`);
};

const selectUserCount = () => {
  return db.select(db.raw("COUNT(*) AS count")).from("users");
};

const selectUserCountAttending = (identifier) => {
  return db
    .select(db.raw("COUNT(*) AS count"))
    .from(`event_${identifier}`)
    .where("attended", 1);
};

const removeUser = (barcodeNum) => {
  return db.where("barcodeNum", barcodeNum).from("users").del();
};

const removeEvent = (identifier) => {
  return db.where("identifier", identifier).from("events").del();
};

const dropEventTable = (identifier) => {
  return db.schema.dropTableIfExists(`event_${identifier}`);
};

const selectUserEmail = (barcodeNum) => {
  return db.select("email").where("barcodeNum", barcodeNum).from("users");
};

const insertAccount = (type, username, password) => {
  return db
    .insert({
      type: type,
      username: username,
      password: password,
    })
    .into("login");
};

const selectAccountType = (username, password) => {
  return db
    .select("type")
    .from("login")
    .whereRaw(`UPPER(username) = '${username.toUpperCase()}'`)
    .andWhere("password", password);
};

const insertSession = (type, token, username, expires) => {
  return db
    .insert({
      type: type,
      token: token,
      username: username,
      expires: expires,
    })
    .into("session");
};

const selectSession = (token) => {
  return db.select("expires", "type").from("session").where("token", token);
};

module.exports = {
  selectScopes,
  selectKeys,
  selectEvents,
  insertEvent,
  createEventTable,
  updateEvent,
  selectUsers,
  insertUser,
  updateUser,
  selectEventsCount,
  selectEventsStatus,
  selectUserCheckedInExists,
  selectUserCheckedIn,
  updateUserCheckIn,
  selectUserExists,
  checkinUser,
  selectUserCount,
  selectUserCountAttending,
  removeUser,
  removeEvent,
  dropEventTable,
  selectUserEmail,
  insertAccount,
  selectAccountType,
  insertSession,
  selectSession,
};
