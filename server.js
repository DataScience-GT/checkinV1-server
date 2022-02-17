//load express stuff
require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const port = process.env.PORT;

//load other things
const testRouter = require("./route");
app.use("/api", testRouter);

app.use(cors());

// Configuring body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//---------------end of requests----------
app.listen(process.env.PORT || port, () =>
  console.log(`App listening on port ${port}!`)
);
