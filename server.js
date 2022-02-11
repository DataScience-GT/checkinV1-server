//load express stuff
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const port = 5000;

//load other things
const generateApiKey = require("generate-api-key");

//load the database
const db = require("./db/database.js");
var md5 = require("md5");

// Where we will keep books
let books = {
  isbn: "9781593275846",
  title: "Eloquent JavaScript, Second Edition",
  author: "Marijn Haverbeke",
  publish_date: "2014-12-14",
  publisher: "No Starch Press",
  numOfPages: "472",
};

app.use(cors());

// Configuring body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//---------------------------------

function checkAPIkey(key, requiredScope) {
  let hash1 = md5(key);
  //verify key
  return new Promise((resolve, reject) => {
    let sql = `SELECT scopes FROM api_keys WHERE key = '${hash1}'`;
    db.all(sql, (err, rows) => {
      if (err) {
        //res.status(400).json({ error: err.message });
        reject(err.message);
      }
      if (rows.length <= 0) {
        //res.status(400).json({ error: "API Key does not exist" });
        reject("API Key does not exist");
      }
      if (rows.length > 1) {
        //res.status(400).json({ error: "duplicate API Keys exist" });
        reject("duplicate API Keys exist");
      }
      //verify scope
      if (!hasScope(rows, requiredScope)) {
        //res.status(400).json({ error: "Key scope does not allow this request" });
        reject(`key scope does not contain ${requiredScope}`);
      }
      resolve("success");
    });
  });
}

function hasScope(rows, required) {
  let row = rows[0];
  let scopes = row.scopes.split(",");
  //console.log(scopes);

  //if (required == "*") {
  //master
  if (
    (scopes.length > 1 && scopes.includes("*")) ||
    (scopes.length == 1 && scopes == "*")
  ) {
    return true;
  }
  //} else if (required.includes(".")) {
  //required.*
  if (
    (scopes.length > 1 && scopes.includes(required.split(".")[0] + ".*")) ||
    (scopes.length == 1 && scopes == required.split(".")[0] + ".*")
  ) {
    return true;
  }
  //required.required
  if (
    (scopes.length > 1 && scopes.includes(required)) ||
    (scopes.length == 1 && scopes == required)
  ) {
    return true;
  }
  //}

  //incorrect scope or error
  return false;
}

//-----------------requests---------------

/**
 * @return list of api keys
 */
app.get("/api/:key/keys/list", async (req, res) => {
  //check for prerequisites
  let key = req.params.key;
  try {
    let result = await checkAPIkey(key, "key.list");
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }

  //get all api keys
  var sql = "select * from api_keys";
  var params = [];
  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: "success",
      data: rows,
    });
  });
});

/**
 * @return newly generated master key
 */
app.get("/api/:key/keys/generatemaster", async (req, res) => {
  //check for prerequisites
  let key = req.params.key;
  try {
    let result = await checkAPIkey(key, "*");
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }

  //generate new key
  let prefix = generateApiKey({ method: "bytes", length: 7 });
  let affix = generateApiKey({ method: "bytes", length: 20 });
  let apikey = prefix + "." + affix;
  let hash2 = md5(apikey);
  var sql = `INSERT INTO api_keys (name, prefix, key, scopes) VALUES ('Master', '${prefix}', '${hash2}', '*');`;
  db.run(sql, (err) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: "success",
      apikey: apikey,
    });
  });
});

/**
 * @return scopes of api key
 */
app.get("/api/:key/keys/test", async (req, res) => {
  let key = req.params.key;
  let hash = md5(key);

  //verify key
  let sql = `SELECT scopes FROM api_keys WHERE key = '${hash}'`;
  db.all(sql, (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (rows.length <= 0) {
      res.status(400).json({ error: "API Key does not exist" });
      return;
    }
    if (rows.length > 1) {
      res.status(400).json({ error: "duplicate API Keys exist" });
      return;
    }
    res.json({
      message: "success",
      data: rows,
    });
  });
});

/**
 * @return list of events
 */
app.get("/api/:key/event/list", async (req, res) => {
  //check for prerequisites
  let key = req.params.key;
  try {
    let result = await checkAPIkey(key, "event.list");
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }

  //get all events
  let sql = `SELECT * FROM events;`;
  db.all(sql, (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: "success",
      data: rows,
    });
  });
});

/**
 * @param body event to create
 */
app.post("/api/:key/event/create", async (req, res) => {
  //check for prerequisites
  let key = req.params.key;
  try {
    let result = await checkAPIkey(key, "event.create");
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }

  //get body data
  var errors = [];
  if (!req.body.event) {
    errors.push("must include a new event");
  } else {
    if (!req.body.event.name) {
      errors.push("New events must have a name");
    }
    if (!req.body.event.identifier) {
      errors.push("New events must have an identifer");
    } else if (req.body.event.identifier.includes(" ")) {
      errors.push("Event identifiers cannot include spaces");
    } else if (req.body.event.identifier.length > 24) {
      errors.push("Event identifiers cannot be longer than 24 characters");
    }
  }
  if (errors.length) {
    res.status(400).json({ error: errors.join(", ") });
    return;
  }

  //insert into events table
  let sql = `INSERT INTO events (name, identifier, description) VALUES ('${req.body.event.name}', '${req.body.event.identifier}', '${req.body.event.description}');`;
  if (!req.body.event.description) {
    sql = `INSERT INTO events (name, identifier) VALUES ('${req.body.event.name}', '${req.body.event.identifier}');`;
  }
  db.run(sql, (err) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    //create new table for event
    let sql2 = `CREATE TABLE "${req.body.event.identifier}" (
	"barcodeNum"	INTEGER NOT NULL UNIQUE,
	"attended"	INTEGER NOT NULL DEFAULT 0,
	"lastModified"	TEXT,
	"modifiedBy"	TEXT,
	FOREIGN KEY("modifiedBy") REFERENCES "api_keys"("prefix"),
	FOREIGN KEY("barcodeNum") REFERENCES "users"("barcodeNum")
);`;
    db.run(sql2, (err) => {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
    });
    res.json({
      message: "success",
    });
  });
});

/**
 * @param body event to create
 */
app.post("/api/:key/event/update", async (req, res) => {
  //check for prerequisites
  let key = req.params.key;
  try {
    let result = await checkAPIkey(key, "event.update");
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }

  //get body data
  var errors = [];
  if (!req.body.event) {
    errors.push("must include a new event");
  } else {
    if (!req.body.event.name) {
      errors.push("New events must have a name");
    }
    if (!req.body.event.identifier) {
      errors.push("New events must have an identifer");
    } else if (req.body.event.identifier.includes(" ")) {
      errors.push("Event identifiers cannot include spaces");
    } else if (req.body.event.identifier.length > 24) {
      errors.push("Event identifiers cannot be longer than 24 characters");
    }
  }
  if (errors.length) {
    res.status(400).json({ error: errors.join(", ") });
    return;
  }
  let sql = `UPDATE events SET name = '${req.body.event.name}', description = '${req.body.event.description}' WHERE identifier = '${req.body.event.identifier}';`;
  if (!req.body.event.description) {
    sql = `UPDATE events SET name = '${req.body.event.name}' WHERE identifier = '${req.body.event.identifier}';`;
  }
  db.run(sql, (err) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: "success",
    });
  });
});

/* ---------- TEMPLATE -------------'
app.get("/api/:key/", async (req, res) => {
  //check for prerequisites
  let key = req.params.key;
  try {
    let result = await checkAPIkey(key, "*");
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }

  //do something
  let sql = ``;
  db.all(sql, (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: "success",
      data: rows,
    });
  });
});
*/

//---------------end of requests----------
app.listen(process.env.PORT || port, () =>
  console.log(`Hello world app listening on port ${port}!`)
);
