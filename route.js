const router = require("express").Router();
const Database = require("./model");

const generateApiKey = require("generate-api-key");
const nodemailer = require("nodemailer");
const qr = require("qrcode");
const fs = require("fs");
var md5 = require("md5");

async function checkAPIkey(key, requiredScope) {
  let hash = md5(key);
  //verify key
  const res = await Database.selectScopes(hash);

  if (res.length <= 0) {
    throw new Error("Api Key not found.");
    return;
  } else if (res.length > 1) {
    throw new Error("Duplicate Api Keys found.");
    return;
  }
  const scopes = res[0].scopes;
  if (!hasScope(scopes, requiredScope)) {
    throw new Error("Missing required scopes.");
    return;
  }
}

function hasScope(scopesRaw, required) {
  const scopes = scopesRaw.split(",");

  //master
  if (
    (scopes.length > 1 && scopes.includes("*")) ||
    (scopes.length == 1 && scopes == "*")
  ) {
    return true;
  }
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

router.get("/", async (req, res) => {
  try {
    const scope = await checkAPIkey(
      "7f51d72.f5e2247e589b3fcfbdd8",
      "user.list"
    );
  } catch (err) {
    res.status(400).json({ error: err.message });
    return;
  }
});

/**
 * key.list
 */
router.get("/:key/key/list", async (req, res) => {
  //check for prerequisites
  let key = req.params.key;
  try {
    let result = await checkAPIkey(key, "key.list");
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }

  //get all api keys
  try {
    const keys = await Database.selectKeys();
    res.json({
      message: "success",
      data: keys,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
    return;
  }
});

/**
 * key.generatemaster
 */
router.get("/:key/key/generatemaster", async (req, res) => {
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
  try {
    await Database.insertKey("Master", prefix, hash2, "*");
    res.json({
      message: "success",
      apikey: apikey,
    });
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }
});

/**
 * event.list
 */
router.get("/:key/event/list", async (req, res) => {
  //check for prerequisites
  let key = req.params.key;
  try {
    let result = await checkAPIkey(key, "event.list");
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }

  try {
    const events = await Database.selectEvents();
    res.json({
      message: "success",
      data: events,
    });
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }
});

/**
 * event.create
 */
router.post("/:key/event/create", async (req, res) => {
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
  //var status = 0;
  //var statusChanged = false;
  if (!req.query.name) {
    errors.push("New events must have a name");
  }
  if (!req.query.identifier) {
    errors.push("New events must have an identifer");
  } else if (req.query.identifier.includes(" ")) {
    errors.push("Event identifiers cannot include spaces");
  } else if (req.query.identifier.length > 24) {
    errors.push("Event identifiers cannot be longer than 24 characters");
  }

  //res.json({data: req.query});
  //return;

  if (req.query.status) {
    if (
      +req.query.status > 1 ||
      +req.query.status < 0 ||
      !Number.isInteger(+req.query.status)
    ) {
      errors.push("Event status can only have values 0,1");
    } else {
      //status = req.query.status;
      //statusChanged = true;
    }
  }

  if (errors.length) {
    res.status(400).json({ error: errors.join(", ") });
    return;
  }

  try {
    const event = await Database.insertEvent(
      req.query.identifier,
      req.query.name,
      req.query.description,
      req.query.status
    );
    const table = await Database.createEventTable(req.query.identifier);
    res.json({
      message: "success",
    });
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }
});

/**
 * event.update
 */
router.post("/:key/event/update", async (req, res) => {
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
  //var status = 0;
  //var statusChanged = false;
  if (!req.query.identifier) {
    errors.push("Query must include an identifier property");
  } else if (req.query.identifier.includes(" ")) {
    errors.push("Event identifiers cannot include spaces");
  } else if (req.query.identifier.length > 24) {
    errors.push("Event identifiers cannot be longer than 24 characters");
  }

  //res.json({data: req.query});
  //return;

  if (req.query.status) {
    if (
      +req.query.status > 1 ||
      +req.query.status < 0 ||
      !Number.isInteger(+req.query.status)
    ) {
      errors.push("Event status can only have values 0,1");
    } else {
      //status = req.query.status;
      //statusChanged = true;
    }
  }
  if (errors.length) {
    res.status(400).json({ error: errors.join(", ") });
    return;
  }
  try {
    const event = await Database.updateEvent(
      req.query.identifier,
      req.query.name,
      req.query.description,
      req.query.status
    );
    res.json({
      message: "success",
    });
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }
});

/**
 * event.checkin
 */
router.post("/:key/event/checkin", async (req, res) => {
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

  if (!req.query.eventIdentifier) {
    errors.push("Query must include an eventIdentifier property");
  }

  if (!req.query.userBarcode) {
    errors.push("Query must include a userBarcode property");
  }

  if (errors.length) {
    res.status(400).json({ error: errors.join(", ") });
    return;
  }

  try {
    //get event count
    const eventCount = await Database.selectEventsCount(
      req.query.eventIdentifier
    );
    if (eventCount[0].count <= 0) {
      res.status(400).json({ error: "Event not found" });
      return;
    }
    //get event status
    const eventStatus = await Database.selectEventsStatus(
      req.query.eventIdentifier
    );
    if (eventStatus[0].status <= 0) {
      res.status(400).json({ error: "Event has been disabled" });
      return;
    }
    //check whether user exists
    const userExists = await Database.selectUserExists(req.query.userBarcode);
    if (userExists[0].count <= 0) {
      res.status(400).json({
        error: "User does not exist",
      });
      return;
    }
    //check whether user checkin exists
    const checkedInExists = await Database.selectUserCheckedInExists(
      req.query.eventIdentifier,
      req.query.userBarcode
    );
    if (checkedInExists[0].count > 0) {
      //check whether user checked in
      const checkedIn = await Database.selectUserCheckedIn(
        req.query.eventIdentifier,
        req.query.userBarcode
      );
      if (checkedIn[0].count > 0) {
        res.status(400).json({
          error: "User is already checked in for this event",
        });
        return;
      }
      //update existing checkin
      await Database.updateUserCheckIn(
        req.query.eventIdentifier,
        req.query.userBarcode,
        1,
        prefix
      );
    } else {
      //insert user into event checkin table
      const user = await Database.checkinUser(
        req.query.eventIdentifier,
        req.query.userBarcode,
        1,
        prefix
      );
    }
    res.json({ message: "success" });
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }
});

/**
 * event.uncheckin
 */
router.post("/:key/event/uncheckin", async (req, res) => {
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

  if (!req.query.eventIdentifier) {
    errors.push("Query must include an eventIdentifier property");
  }

  if (!req.query.userBarcode) {
    errors.push("Query must include a userBarcode property");
  }

  if (errors.length) {
    res.status(400).json({ error: errors.join(", ") });
    return;
  }

  try {
    //get event status
    const eventStatus = await Database.selectEventsStatus(
      req.query.eventIdentifier
    );
    if (eventStatus[0].status <= 0) {
      res.status(400).json({ error: "Event has been disabled" });
      return;
    }
    //check whether user exists
    const userExists = await Database.selectUserExists(req.query.userBarcode);
    if (userExists[0].count <= 0) {
      res.status(400).json({
        error: "User does not exist",
      });
      return;
    }
    //update existing checkin
    await Database.updateUserCheckIn(
      req.query.eventIdentifier,
      req.query.userBarcode,
      0,
      prefix
    );

    res.json({ message: "success" });
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }
});

/**
 * event.status
 */
router.get("/:key/event/status", async (req, res) => {
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

  if (!req.query.eventIdentifier) {
    errors.push("Query must include an eventIdentifier property");
  }

  if (errors.length) {
    res.status(400).json({ error: errors.join(", ") });
    return;
  }

  try {
    //get event status
    const eventStatus = await Database.selectEventsStatus(
      req.query.eventIdentifier
    );
    //get users attending
    const userAttending = await Database.selectUserCountAttending(
      req.query.eventIdentifier
    );
    //get users total
    const userTotal = await Database.selectUserCount();

    res.json({
      message: "success",
      data: {
        attended: userAttending[0].count,
        total: userTotal[0].count,
        status: eventStatus[0].status,
      },
    });
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }
});

/**
 * event.checkedin
 */
router.get("/:key/event/checkedin", async (req, res) => {
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

  if (!req.query.eventIdentifier) {
    errors.push("Query must include an eventIdentifier property");
  }

  if (!req.query.userBarcode) {
    errors.push("Query must include a userBarcode property");
  }

  if (errors.length) {
    res.status(400).json({ error: errors.join(", ") });
    return;
  }

  try {
    //check whether user checked in
    const checkedIn = await Database.selectUserCheckedIn(
      req.query.eventIdentifier,
      req.query.userBarcode
    );
    res.json({ message: "success", data: checkedIn });
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }
});

/**
 * user.list
 */
router.get("/:key/user/list", async (req, res) => {
  //check for prerequisites
  let key = req.params.key;
  try {
    let result = await checkAPIkey(key, "user.list");
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }

  try {
    const users = await Database.selectUsers();
    res.json({
      message: "success",
      data: users,
    });
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }
});

/**
 * user.create
 */
router.post("/:key/user/create", async (req, res) => {
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

  if (!req.query.userName) {
    errors.push("Query must include userName property");
  }
  if (!req.query.userEmail) {
    errors.push("Query must include userEmail property");
  } else if (!req.query.userEmail.includes("@")) {
    errors.push("User email not in valid format");
  }
  if (req.query.barcodeNum) {
    if (!Number.isInteger(req.query.barcodeNum)) {
      errors.push("User barcodeNum must be an integer");
    }
  }

  if (errors.length) {
    res.status(400).json({ error: errors.join(", ") });
    return;
  }
  let barcode = req.query.barcodeNum;
  if (!barcode) {
    barcode = +generateApiKey({ length: 11, pool: "0123456789" });
  }

  try {
    const user = await Database.insertUser(
      barcode,
      req.query.userName,
      req.query.userEmail
    );
    res.json({
      message: "success",
    });
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }
});

/**
 * user.remove
 */
router.post("/:key/user/remove", async (req, res) => {
  //check for prerequisites
  let key = req.params.key;
  try {
    let result = await checkAPIkey(key, "user.remove");
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }

  //get body data
  var errors = [];

  if (!req.query.barcodeNum) {
    errors.push("Query must include barcodeNum property");
  }

  if (errors.length) {
    res.status(400).json({ error: errors.join(", ") });
    return;
  }

  try {
    await Database.removeUser(req.query.barcodeNum);
    res.json({
      message: "success",
    });
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }
});

/**
 * event.remove
 */
router.post("/:key/event/remove", async (req, res) => {
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

  if (!req.query.identifier) {
    errors.push("Query must include identifier property");
  }

  if (errors.length) {
    res.status(400).json({ error: errors.join(", ") });
    return;
  }

  try {
    await Database.removeEvent(req.query.identifier);
    await Database.dropEventTable(req.query.identifier);
    res.json({
      message: "success",
    });
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }
});

/**
 * user.update
 */
router.post("/:key/user/update", async (req, res) => {
  //check for prerequisites
  let key = req.params.key;
  try {
    let result = await checkAPIkey(key, "user.update");
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }

  //get body data
  var errors = [];

  if (!req.query.barcodeNum) {
    errors.push("Query must include barcodeNum property");
  }
  if (!req.query.userName && !req.query.userEmail) {
    errors.push("Query must include userName or userEmail property");
  }
  if (req.query.userEmail && !req.query.userEmail.includes("@")) {
    errors.push("User email not in valid format");
  }

  if (errors.length) {
    res.status(400).json({ error: errors.join(", ") });
    return;
  }

  try {
    const user = await Database.updateUser(
      req.query.barcodeNum,
      req.query.userName,
      req.query.userEmail
    );
    res.json({
      message: "success",
    });
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }
});

/**
 * user.email
 */
router.get("/:key/user/email", async (req, res) => {
  //check for prerequisites
  let key = req.params.key;
  try {
    let result = await checkAPIkey(key, "user.email");
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }

  if (!req.query.barcodeNum) {
    res.status(400).json({ error: "Query must include barcodeNum property" });
    return;
  }

  try {
    const email = await Database.selectUserEmail(req.query.barcodeNum);
    if (!email[0].email) {
      res.status(400).json({ error: "User not found with given barcodeNum" });
      return;
    }
    //send email
    qr.toDataURL(req.query.barcodeNum, function (err, url) {
      if (err) {
        res.status(400).json({ error: err });
        return;
      }
      //console.log(url)
      let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD,
        } /*
            dkim: {
              domainName: "hacklytics2022.com",
              keySelector: "key1",
              privateKey: fs.readFileSync("./certificates/dkim/dkim.pem", "utf8"),
              cacheDir: "/tmp",
              cacheTreshold: 100 * 1024,
            },*/,
      });
      //console.log(url)
      message = {
        from: process.env.EMAIL_USERNAME,
        to: email[0].email,
        subject: "Next Steps - Hacklytics 2022",
        html: `<!DOCTYPE html
            PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
          <html xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:v="urn:schemas-microsoft-com:vml" lang="en">
          
          <head>
            <link rel="stylesheet" type="text/css" hs-webfonts="true"
              href="https://fonts.googleapis.com/css?family=Lato|Lato:i,b,bi">
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link
              href="https://fonts.googleapis.com/css2?family=Red+Hat+Text:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&display=swap"
              rel="stylesheet">
            <title>Hacklytics 2022 Emailer</title>
            <meta property="og:title" content="Email template">
          
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
          
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
          
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          
            <style type="text/css">
              table {
                table-layout: fixed;
              }
          
              a {
                text-decoration: underline;
                color: inherit;
                color: blue;
              }
          
              h1 {
                font-size: 32px;
              }
          
              h2 {
                font-size: 28px;
                font-weight: 900;
              }
          
              img {
                max-width: 100%;
              }
          
              p {
                font-weight: 100;
              }
          
              td {
                text-align: center;
                vertical-align: middle;
              }
          
              td.main {
                text-align: left;
          
              }
          
              #email {
                margin: auto;
                width: 600px;
                background-color: white;
              }
          
              button {
                font: inherit;
                background-color: rgba(32, 163, 158, 1);
                border: none;
                padding: 10px;
                text-transform: uppercase;
                letter-spacing: 2px;
                font-weight: 900;
                color: white;
                border-radius: 5px;
                box-shadow: 3px 3px #ADCEF2;
                text-align: center;
              }
          
              .subtle-link {
                font-size: 9px;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: #CBD6E2;
              }
          
              #applyButton {
                /*position: fixed;*/
                box-sizing: border-box;
                width: fit-content;
                /*right: 15px;*/
                padding: 15px 10px;
                background-color: #7e3f73;
                /*top: 15px;*/
                color: #fff;
                font-size: 26px;
                font-weight: 600;
                font-family: 'Red Hat Text';
                text-decoration: none;
                border-radius: 5px;
                /*z-index: 9999;*/
              }
          
              .heading {
                position: relative;
                color: rgba(32, 163, 158, 1);
                font-size: 50px;
                text-transform: uppercase;
                text-align: center;
              }
          
              .center {
                margin-left: auto;
                margin-right: auto;
              }
          
              #qr-image {
                display: block;
                margin: 0 auto;
              }
            </style>
          
          </head>
          
          <body bgcolor="#F5F8FA"
            style="width: 100%; margin: auto 0; padding:0; font-family:Lato, sans-serif; font-size:18px; color:#33475B; word-break:break-word; text-align: left;">
          
            <! View in Browser Link -->
          
              <div id="email">
          
          
          
                <! Banner -->
                  <table cellpadding="0" cellspacing="0px" bgcolor="#B7CCEC" role="presentation" class="center"
                    style="color: white; text-align: center; white-space: nowrap" width="100%">
                    <tr>
          
                      <th style="color: white; text-align: center; padding: 0px">
                        <img style="padding: 0px;" src="https://i.ibb.co/3kmZTTh/Screenshot-2022-02-02-at-5-20-30-PM.png"
                          alt="Hacklytics-2022-header" border="0">
                      </th>
          
                    </tr>
                  </table>
          
                  <p style="line-height: 0;font-size: 12px" align="center">Brought to you by <a href="https://datasciencegt.org"
                      style="color:rgba(32, 163, 158, 1);" target="_blank">Data Science at GT</a>, a 501(c)(3) organization</p>
          
          
          
          
                  <! First Row -->
          
                    <table role="presentation" border="0" cellpadding="0" cellspacing="10px" style="padding: 0px 30px 30px 30px;">
          
                      <tr>
                        <td class="main">
                          <h1 align="center">What next?</h1>
          
                          <p>
                            Please show us this QR code when you check in at the event.
                          </p>
                          <img id="qr-image" width="200" height="200" src="cid:qrcode@send" />
                          <p>
                            Now that you've been accepted into Hacklytics 2022, here are the next steps:
                          </p>
          
                          <ul>
                            <li> Fill out the <a
                                href="https://docs.google.com/forms/d/e/1FAIpQLSciOboudzy4FVOOd5bEgkmc44JbJw5B0s7etkjSZnsz6q_nig/viewform"
                                target="_blank">confirmation form</a> before Thursday, 17th February 2022.
                            <li> Join the <a href="https://discord.gg/9aZUUUDf" target="_blank">Discord</a> and interact with
                              hackers, talk to sponsors, form teams, and ask us your questions. We will be using it for all
                              important communication.
                            <li> Register for Hacklytics 2022 on <a href="https://hacklytics-2022.devpost.com/"
                                target="_blank">Devpost</a>.
                            <li> Register for Google Cloud's Workshop on Cloud Management <a href="https://goo.gle/hacklytics" ,
                                target="_blank">here</a>. It will occur on Thursday, 02/17.
                            <li> New to hacking? Check out <a href="https://guide.mlh.io/">this guide</a> that covers everything
                              you will need.
                          </ul>
          
                          <h3>Messages from our Sponsors</h3>
                          <p>
                            <strong>CREATE-X</strong>: If you are selected as one of the top 3 winners, we offer you an automatic
                            acceptance to our <a
                              href="https://create-x.gatech.edu/#:~:text=CREATE%2DX's%20Startup%20Launch%20is,fully%20functioning%20and%20viable%20startups."
                              target="_blank">Startup Launch</a> program, should you choose to continue your project. We will
                            provide you with mentors, contacts, and all the resources you need to turn your project into a
                            real-world product.
                          </p>
                          <p>
                            <strong>DeepNote</strong>: Deepnote is a collaborative Python notebook that runs in your browser. We
                            will be providing you with lightning fast GPUs upon which you can train your ML models. Our
                            easy-to-use software will also make it incredibly simple for you to visualize data in a plethora of
                            different formats.
                          </p>
          
          
                          <p>
                            Feel free to reach out to us at <a target="_blank"
                              href="mailto:hello@hacklytics.io">hello@hacklytics.io</a> for any questions!
                          </p>
                          <p>
                            See you there, <br>The Hacklytics Team
                          </p>
                          <!-- <br> -->
                          <p style="font-size: 12px; color: gray">
                            While you're at it, check out our <a href="https://hacklytics.io/" target="_blank">website</a> and
                            drop a follow on our <a href="https://www.instagram.com/hacklytics/">Instagram!</a>
                          </p>
          
                        </td>
                      </tr>
                    </table>
          
                    <! Footer -->
                      <table role="presentation" width="100%" class="center">
                        <tr>
                          <td bgcolor="gray" align="center" style="color: white;" width="50%">
                            <h2>Thanks to our supportive sponsors!</h2>
          
                            <table align="center" width="75%" style="white-space: nowrap; text-align: center" text-align="center">
          
                              <tr>
          
                                <td>
                                  <img src="https://hacklytics.io/assets/images/sponsors/anthem.png" width="300px">
                                </td>
          
                                <td>
                                  <img src="https://i.ibb.co/YWJT5Yn/CREATE-X-GTGold-CMYK.png" alt="CREATE-X-GTGold-CMYK"
                                    border="0" width="200px">
          
                                </td>
          
                              </tr>
                              <tr>
                                <td>
                                  <a href="https://deepnote.com/" target="_blank"><img
                                      src="https://i.ibb.co/7vwt9jY/deepnote-logo.png" alt="deepnote-logo" border="0"
                                      width="200px"></a>
                                </td>
                                <td>
                                  <img src="https://hacklytics.io/assets/images/sponsors/gtAthletics.png" width="300px">
                                </td>
                              </tr>
          
          
                            </table>
          
          
                            <!-- <a id="applyButton" target="_blank" href="https://form.typeform.com/to/J7doCIw1" class="text">Apply Now!</a> -->
          
                          </td>
                        </tr>
                      </table>
          
              </div>
          </body>
          
          </html>`,
        attachments: [
          {
            // encoded string as an attachment
            filename: "image.png",
            path: url,
            cid: "qrcode@send",
          },
        ],
      };
      transporter.sendMail(message, function (err, info) {
        if (err) {
          res.status(400).json({ error: err });
          return;
        } else {
          res.json({ message: "success" });
        }
      });
    });
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }
});

/**
 * account.create
 */
router.post("/:key/account/create", async (req, res) => {
  //check for prerequisites
  let key = req.params.key;
  try {
    let result = await checkAPIkey(key, "account.create");
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }

  //get body data
  var errors = [];

  if (!req.query.username) {
    errors.push("Query must include username property");
  } else if (req.query.username.includes(" ")) {
    errors.push("Username cannot include spaces");
  } else if (req.query.username.length > 16) {
    errors.push("Username cannot be longer than 16 characters");
  }

  if (!req.query.password) {
    errors.push("Query must include password property");
  } else if (req.query.password.includes(" ")) {
    errors.push("Password cannot include spaces");
  } else if (req.query.password.length > 16) {
    errors.push("Password cannot be longer than 16 characters");
  }

  let validTypes = ["default", "mod", "admin"];
  if (!req.query.type) {
    errors.push("Query must include type property");
  } else if (!validTypes.includes(req.query.type.toLowerCase())) {
    errors.push("Type must be of value 'default', 'mod', or 'admin'");
  }

  if (errors.length) {
    res.status(400).json({ error: errors.join(", ") });
    return;
  }

  try {
    await Database.insertAccount(
      req.query.type,
      req.query.username,
      md5(req.query.password)
    );
    res.json({
      message: "success",
    });
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }
});

/**
 * account.login
 */
router.get("/:key/account/login", async (req, res) => {
  //check for prerequisites
  let key = req.params.key;
  try {
    let result = await checkAPIkey(key, "account.login");
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }

  //get body data
  var errors = [];

  if (!req.query.username) {
    errors.push("Query must include username property");
  } else if (req.query.username.includes(" ")) {
    errors.push("Username cannot include spaces");
  } else if (req.query.username.length > 16) {
    errors.push("Username cannot be longer than 16 characters");
  }

  if (!req.query.password) {
    errors.push("Query must include password property");
  } else if (req.query.password.includes(" ")) {
    errors.push("Password cannot include spaces");
  } else if (req.query.password.length > 16) {
    errors.push("Password cannot be longer than 16 characters");
  }

  if (errors.length) {
    res.status(400).json({ error: errors.join(", ") });
    return;
  }

  try {
    const accountType = await Database.selectAccountType(
      req.query.username,
      md5(req.query.password)
    );
    if (!accountType.length) {
      res.status(400).json({ error: "Invalid username or password" });
      return;
    }

    //credentials correct
    //create session, return token and type
    let type = accountType[0].type;
    let token = generateApiKey({ method: "bytes", length: 32 });
    //get time when expires
    let expires = new Date(new Date().getTime() + 24 * 60 * 60 * 1000); //add 1 day
    await Database.insertSession(
      type,
      token,
      req.query.username,
      expires.toISOString()
    );
    res.json({ message: "success", token: token, type: type });
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }
});

/**
 * account.session
 */
router.get("/:key/account/session", async (req, res) => {
  //check for prerequisites
  let key = req.params.key;
  try {
    let result = await checkAPIkey(key, "account.session");
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }

  //get body data
  var errors = [];

  if (!req.query.token) {
    errors.push("Query must include token property");
  }

  if (errors.length) {
    res.status(400).json({ error: errors.join(", ") });
    return;
  }

  try {
    const session = await Database.selectSession(req.query.token);
    if (!session.length) {
      res.status(400).json({ error: "Session not found" });
      return;
    }
    //check if session expired
    let now = new Date();
    let expires = new Date(session[0].expires);
    if (now > expires) {
      res.status(400).json({ error: "Session has expired" });
      return;
    }
    res.json({
      message: "success",
      data: { type: session[0].type },
    });
  } catch (err) {
    res.status(400).json({ error: err });
    return;
  }
});

module.exports = router;
