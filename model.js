const db = require("./data/db-config");

const findAll = () => {
  return db("profiles");
};

module.exports = {
  findAll,
};
