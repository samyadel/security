require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

// Use the session package
app.use(
  session({
    secret:
      "U%xBuT#r&6rrfkVabLN3w6s3hd2MobfQAvO5rT%Czh$fXFYZYc63$%xjx#mjwMYx3iaau!YxMsLfhapikR1%zwdZneN5pZyYXw&",
    resave: false,
    saveUninitialized: false,
  })
);

// Use passport and initialise the passport package
app.use(passport.initialize());
// Use passport for dealing with the sessions
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/usersDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Fixes deprication warning
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});

// We are going to use passportLocalMongoose to hash and salt our passwords and to save our users into our mongoDB database
userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/secrets", (req, res) => {
  // If the user is authenticated
  if (req.isAuthenticated()) {
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", (req, res) => {
  // Logout the user
  req.logout();
  res.redirect("/");
});

app.post("/register", (req, res) => {
  // Register a new user with a username of whatever the user inputed in the email field and a password of whatever the user inputed in the password field
  User.register({ username: req.body.username }, req.body.password, (err) => {
    // If there was an error registering a new user
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      // Authenticate a new user
      passport.authenticate("local")(
        // If this function gets called, the authentication was successful
        req,
        res,
        () => {
          res.redirect("/secrets");
        }
      );
    }
  });
});

app.post("/login", (req, res) => {
  // Create a new user with a username of whatever the user inputs in the username (email) field and a password of whatever the user inputs in the password field
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  // Login the user
  /* Parameters
  1) The user you want to login
  2) A callback function that allows you to handle errors; if the user tries to login with the wron credentials, there will be an error
  */
  req.login(user, (err) => {
    if (err) {
      console.log(err);
    } else {
      // Authenticate the user that is trying to login
      passport.authenticate("local")(req, res, () => {
        res.redirect("/secrets");
      });
    }
  });
});

app.listen(3000, () => {
  console.log("Server started on port 3000");
});
