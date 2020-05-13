require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const md5 = require("md5");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect("mongodb://localhost:27017/usersDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});

const User = mongoose.model("User", userSchema);

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res) => {
  // Create a new user
  // The user email is going to be whatever the user inputs in the email field
  // The password is going to be whatever the user inputs in the password field
  const user = new User({
    email: req.body.username,
    password: md5(req.body.password),
  });

  // Save the user to the database
  user.save((err) => {
    err ? console.log(err) : res.render("secrets");
  });
});

app.post("/login", (req, res) => {
  const email = req.body.username;
  const password = md5(req.body.password);

  // Find a user that has an email of whatever the user has inputed in the email field
  // email #1 = the email of the user in the database
  // email #2 = what the user inputs in the email field
  User.findOne({ email: email }, (err, foundUser) => {
    if (err) {
      console.log(err);
    } else {
      // If this user exists and the password of the found user is equal to what the user inputed in the password field
      if (foundUser && foundUser.password === password) {
        res.render("secrets");
      }
    }
  });
});

app.listen(3000, () => {
  console.log("Server started on port 3000");
});
