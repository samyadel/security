require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const saltRounds = 10;

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
  /* Parameters
  1) What you want to hash
  2) Salt Rounds
  3) Callback function
    Parameters
    1) error
    2) The hashed password
  */
  bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
    // Create a new user
    // The user email is going to be whatever the user inputs in the email field
    // The password is going to be whatever the user inputs in the password field
    const user = new User({
      email: req.body.username,
      // Set the password to the hashed version of what the user inputed in the password field
      password: hash,
    });

    // Save the user to the database
    user.save((err) => {
      err ? console.log(err) : res.render("secrets");
    });
  });
});

app.post("/login", (req, res) => {
  const email = req.body.username;
  const password = req.body.password;

  // Find a user that has an email of whatever the user has inputed in the email field
  // email #1 = the email of the user in the database
  // email #2 = what the user inputs in the email field
  User.findOne({ email: email }, (err, foundUser) => {
    if (err) {
      console.log(err);
    } else {
      // If this user exists
      if (foundUser) {
        // If the password that the user has inputed (hashed version) is equal to the hashed password stored in the database
        // result will either be true, if the password (hashed) is equal to the hashed password which is stored in the database, and will be false if the password (hashed) is not equal to the hashed password stored in the database
        bcrypt.compare(password, foundUser.password, (err, result) => {
          if (result) {
            res.render("secrets");
          }
        });
      }
    }
  });
});

app.listen(3000, () => {
  console.log("Server started on port 3000");
});
