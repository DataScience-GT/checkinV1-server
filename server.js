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
        //console.log(err.message);
        reject(err.message);
      }
      if (rows.length <= 0) {
        //res.status(400).json({ error: "API Key does not exist" });
        //console.log(1);
        reject("API Key does not exist");
      }
      if (rows.length > 1) {
        //res.status(400).json({ error: "duplicate API Keys exist" });
        //console.log(2);
        reject("duplicate API Keys exist");
      }
      //verify scope
      if (!hasScope(rows, requiredScope)) {
        //res.status(400).json({ error: "Key scope does not allow this request" });
        //console.log(3);
        reject(`key scope does not contain ${requiredScope}`);
      }
      resolve("success");
    });
  });
}

function hasScope(rows, required) {
  let row = rows[0];
  if (!row) {
    return false;
  }
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
app.get("/api/:key/key/list", async (req, res) => {
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
app.get("/api/:key/key/generatemaster", async (req, res) => {
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
app.get("/api/:key/key/test", async (req, res) => {
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
  var status = 0;
  var statusChanged = false;
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

  if (req.body.event.status) {
    if (
      0 + req.body.event.status > 1 ||
      0 + req.body.event.status < 0 ||
      !Number.isInteger(req.body.event.status)
    ) {
      errors.push("Event status can only have values 0,1");
    } else {
      status = req.body.event.status;
      statusChanged = true;
    }
  }

  if (errors.length) {
    res.status(400).json({ error: errors.join(", ") });
    return;
  }

  //insert into events table
  var additional = [];
  var values = [];
  //let sql = `INSERT INTO events (status, name, identifier, description) VALUES ('${status}', '${req.body.event.name}', '${req.body.event.identifier}', '${req.body.event.description}');`;
  if (req.body.event.description) {
    additional.push(`description`);
    values.push(`'${req.body.event.description}'`);
  }
  if (statusChanged) {
    additional.push(`status`);
    values.push(`'${status}'`);
  }
  let sql = `INSERT INTO events (name, identifier) VALUES ('${req.body.event.name}', '${req.body.event.identifier}');`;
  if (additional.length > 0) {
    sql = `INSERT INTO events (name, identifier, ${additional.join(
      ", "
    )}) VALUES ('${req.body.event.name}', '${
      req.body.event.identifier
    }', ${values.join(", ")});`;
  }
  db.run(sql, (err) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    //create new table for event
    let sql2 = `CREATE TABLE "event_${req.body.event.identifier}" (
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
  var status = 0;
  var statusChanged = false;
  if (!req.body.event) {
    errors.push("must include an event to update");
  } else {
    if (!req.body.event.identifier) {
      errors.push("Events must have an identifer");
    } else if (req.body.event.identifier.includes(" ")) {
      errors.push("Event identifiers cannot include spaces");
    } else if (req.body.event.identifier.length > 24) {
      errors.push("Event identifiers cannot be longer than 24 characters");
    }

    if (req.body.event.status) {
      if (
        0 + req.body.event.status > 1 ||
        0 + req.body.event.status < 0 ||
        !Number.isInteger(req.body.event.status)
      ) {
        errors.push("Event status can only have values 0,1");
      } else {
        status = req.body.event.status;
        statusChanged = true;
      }
    }
  }
  if (errors.length) {
    res.status(400).json({ error: errors.join(", ") });
    return;
  }

  var additional = [];
  if (req.body.event.name) {
    additional.push(`name = '${req.body.event.name}'`);
  }
  if (req.body.event.description) {
    additional.push(`description = '${req.body.event.description}'`);
  }
  if (statusChanged) {
    additional.push(`status = '${status}'`);
  }
  if (additional.length <= 0) {
    res.status(400).json({ error: "Missing properties of event to update" });
    return;
  }

  let sql = `UPDATE events SET ${additional.join(", ")} WHERE identifier = '${
    req.body.event.identifier
  }';`;
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

/**
 * @param body user and event
 */
app.post("/api/:key/event/checkin", async (req, res) => {
  //check for prerequisites
  let key = req.params.key;
  try {
    let result = await checkAPIkey(key, "event.checkin");
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }

  let prefix = key.split(".")[0];

  //get body data
  var errors = [];

  if (!req.body.event) {
    errors.push("Must include an event");
  } else {
    if (!req.body.event.identifier) {
      errors.push("Event must include an identifier property");
    }
  }

  if (!req.body.user) {
    errors.push("Must include a user");
  } else {
    if (!req.body.user.barcode) {
      errors.push("User must include a barcode property");
    }
  }
  if (errors.length) {
    res.status(400).json({ error: errors.join(", ") });
    return;
  }

  //check whether event is enabled
  let sql5 = `SELECT status FROM events WHERE identifier = '${req.body.event.identifier}'`;
  db.all(sql5, (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    let status = rows[0].status;
    if (!status) {
      res.status(400).json({ error: "Event has been disabled" });
      return;
    } else {
      //check whether user already checked in
      let sql2 = `SELECT COUNT(*) as count FROM event_${req.body.event.identifier} WHERE barcodeNum = '${req.body.user.barcode}'`;
      db.all(sql2, (err, rows) => {
        if (err) {
          res.status(400).json({ error: err.message });
          return;
        }
        if (rows[0].count) {
          let sql3 = `SELECT COUNT(*) as count FROM event_${req.body.event.identifier} WHERE barcodeNum = '${req.body.user.barcode}' AND attended = '1'`;
          db.all(sql3, (err, rows1) => {
            if (err) {
              res.status(400).json({ error: err.message });
              return;
            }
            if (rows1[0].count) {
              res
                .status(400)
                .json({ error: "User is already checked in for this event" });
              return;
            } else {
              //update exisiting checkin
              let sql4 = `UPDATE event_${req.body.event.identifier} SET  attended = '1', lastModified = strftime('%Y-%m-%d %H:%M:%S', 'now'), modifiedBy = '${prefix}' WHERE barcodeNum = '${req.body.user.barcode}';`;
              db.run(sql4, (err) => {
                if (err) {
                  res.status(400).json({ error: err.message });
                  return;
                }
                res.json({
                  message: "success",
                });
              });
            }
          });
        } else {
          //insert into event table
          let sql = `INSERT INTO event_${req.body.event.identifier} (barcodeNum, attended, lastModified, modifiedBy) VALUES ('${req.body.user.barcode}', '1', strftime('%Y-%m-%d %H:%M:%S', 'now'), '${prefix}');`;
          db.run(sql, (err) => {
            if (err) {
              res.status(400).json({ error: err.message });
              return;
            }
            res.json({
              message: "success",
            });
          });
        }
      });
    }
  });
});

/**
 * @param body user and event
 */
app.post("/api/:key/event/uncheckin", async (req, res) => {
  //check for prerequisites
  let key = req.params.key;
  try {
    let result = await checkAPIkey(key, "event.uncheckin");
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }

  let prefix = key.split(".")[0];

  //get body data
  var errors = [];

  if (!req.body.event) {
    errors.push("Must include an event");
  } else {
    if (!req.body.event.identifier) {
      errors.push("Event must include an identifier property");
    }
  }

  if (!req.body.user) {
    errors.push("Must include a user");
  } else {
    if (!req.body.user.barcode) {
      errors.push("User must include a barcode property");
    }
  }
  if (errors.length) {
    res.status(400).json({ error: errors.join(", ") });
    return;
  }

  //check whether event is enabled
  let sql3 = `SELECT status FROM events WHERE identifier = '${req.body.event.identifier}'`;
  db.all(sql3, (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    let status = rows[0].status;
    if (!status) {
      res.status(400).json({ error: "Event has been disabled" });
      return;
    } else {
      //insert into event table table
      let sql = `UPDATE event_${req.body.event.identifier} SET  attended = '0', lastModified = strftime('%Y-%m-%d %H:%M:%S', 'now'), modifiedBy = '${prefix}' WHERE barcodeNum = '${req.body.user.barcode}';`;
      db.run(sql, (err) => {
        if (err) {
          res.status(400).json({ error: err.message });
          return;
        }
        res.json({
          message: "success",
        });
      });
    }
  });
});

/**
 * @param body user and event
 */
app.get("/api/:key/event/status", async (req, res) => {
  //check for prerequisites
  let key = req.params.key;
  try {
    let result = await checkAPIkey(key, "event.status");
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }

  let prefix = key.split(".")[0];

  //get body data
  var errors = [];

  if (!req.body.event) {
    errors.push("Must include an event");
  } else {
    if (!req.body.event.identifier) {
      errors.push("Event must include an identifier property");
    }
  }

  if (errors.length) {
    res.status(400).json({ error: errors.join(", ") });
    return;
  }

  //select all attending users
  let sql = `SELECT COUNT(*) as count FROM event_${req.body.event.identifier} WHERE attended = '1'`;
  db.all(sql, (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    let countAttended = rows[0].count;
    let sql2 = `SELECT COUNT(*) as count FROM users`;
    db.all(sql2, (err, rows) => {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      let countTotal = rows[0].count;

      let sql3 = `SELECT status FROM events WHERE identifier = '${req.body.event.identifier}'`;
      db.all(sql3, (err, rows) => {
        if (err) {
          res.status(400).json({ error: err.message });
          return;
        }
        let status = rows[0].status;
        res.json({
          message: "success",
          data: { attended: countAttended, total: countTotal, status: status },
        });
      });
    });
  });
});

/**
 * @return whether user is checked in to event
 */
app.get("/api/:key/event/checkedin", async (req, res) => {
  //check for prerequisites
  let key = req.params.key;
  try {
    let result = await checkAPIkey(key, "event.checkedin");
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }

  //get body data
  var errors = [];

  if (!req.body.event) {
    errors.push("Must include an event");
  } else {
    if (!req.body.event.identifier) {
      errors.push("Event must include an identifier property");
    }
  }

  if (!req.body.user) {
    errors.push("Must include a user");
  } else {
    if (!req.body.user.barcode) {
      errors.push("User must include a barcode property");
    }
  }
  if (errors.length) {
    res.status(400).json({ error: errors.join(", ") });
    return;
  }

  //get whether user is checked in
  let sql = `SELECT COUNT(*) as count FROM event_${req.body.event.identifier} WHERE barcodeNum = '${req.body.user.barcode}' AND attended = '1';`;
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
 * @return list of users
 */
app.get("/api/:key/user/list", async (req, res) => {
  //check for prerequisites
  let key = req.params.key;
  try {
    let result = await checkAPIkey(key, "user.list");
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }

  //get all events
  let sql = `SELECT * FROM users;`;
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
 * @param body user to create
 */
app.post("/api/:key/user/create", async (req, res) => {
  //check for prerequisites
  let key = req.params.key;
  try {
    let result = await checkAPIkey(key, "user.create");
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }

  //get body data
  var errors = [];

  if (!req.body.user) {
    errors.push("must include a new user");
  } else {
    if (!req.body.user.name) {
      errors.push("New users must have a name");
    }
    if (!req.body.user.email) {
      errors.push("New users must have an email");
    } else if (!req.body.user.email.includes("@")) {
      errors.push("User email not in valid format");
    }
  }
  if (errors.length) {
    res.status(400).json({ error: errors.join(", ") });
    return;
  }
  let barcode = generateApiKey({ length: 11, pool: "0123456789" });

  //insert into users table
  let sql = `INSERT INTO users (name, email, barcodeNum) VALUES ('${req.body.user.name}', '${req.body.user.email}', '${barcode}');`;
  db.run(sql, (err) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: "success",
    });
  });

  //res.json({data: barcode});
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
