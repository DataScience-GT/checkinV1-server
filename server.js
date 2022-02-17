//load express stuff
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const apiRouter = require("./route");
//const bodyParser = require("body-parser");

const app = express();
const port = process.env.PORT;

//load other things
app.use(cors());
app.use(express.json());
app.use("/api", apiRouter);

app.get("/", (req, res) => {
  res.send("<p>This is a test application made by John Ramberger for Hacklytics 2022 @ Georgia Tech</p>");
});
// Configuring body parser middleware
//app.use(bodyParser.urlencoded({ extended: false }));
//app.use(bodyParser.json());

//---------------end of requests----------
app.listen(process.env.PORT || port, () =>
  console.log(`App listening on port ${port}!`)
);
