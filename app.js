require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const FacebookStrategy = require("passport-facebook").Strategy;

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

// Use the session package
app.use(
  session({
    secret: process.env.SECRET,
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
  googleId: String,
  facebookId: String,
  secret: String,
});

// We are going to use the passportLocalMongoose package to hash and salt our passwords and to save our users into our mongoDB database
userSchema.plugin(passportLocalMongoose);
// We are going to use the findOrCreate package to make the findOrCreate function (that previously didn't exist because it was sudo code) work
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

// Use passport to authenticate users using Google OAuth 2.0
// Set up the google strategy
passport.use(
  new GoogleStrategy(
    {
      // These are all the options for using the google strategy to login our user
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      // Don't retrieve the user's profile information from their google plus account but instead retrieve it from the userinfo which is another endpoint on google
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    // This callback function is where google sends back an access token (the thing that allows us to get data related to that user), their profile which contains their email, their google id, etc.
    function (accessToken, refreshToken, profile, cb) {
      // We use the data that we get back (their google id) to either find a user with that id in our database of users or create them if they don't exist
      // User.findOrCreate() is not a real function, it is sudo code (fake code). It is here to tell us that we have to implement some sort of functionality to find or create the user. To make this function work, there is an npm package called mongoose-findOrCreate that will simply make this function work. You have to install it using npm, require it and finally add it as a plugin to our schema
      User.findOrCreate(
        { username: profile.displayName, googleId: profile.id },
        function (err, user) {
          return cb(err, user);
        }
      );
    }
  )
);

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.APP_ID,
      clientSecret: process.env.APP_SECRET,
      callbackURL: "http://localhost:3000/auth/facebook/secrets",
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate(
        { username: profile.displayName, facebookId: profile.id },
        function (err, user) {
          return cb(err, user);
        }
      );
    }
  )
);

app.get("/", (req, res) => {
  res.render("home");
});

app.get(
  "/auth/google",
  // Use passport to authenticate the user using the google strategy
  // Authenticate the user on the google server
  /* Parameters
  1) The type of strategy that we want to authenticate the user with
  2) A scope that tells google that what we want is the user's profile. This includes their email as well as their user ID on google which we will be able to use to identify them
  */
  passport.authenticate("google", { scope: ["profile"] })
);

app.get(
  "/auth/google/secrets",
  // Authenticate the user locally
  /* Parameters
  1) The type of strategy that we want to authenticate the user with
  2) The route to redirect to if the authentication failed
  */
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/secrets");
  }
);

app.get("/auth/facebook", passport.authenticate("facebook"));

app.get(
  "/auth/facebook/secrets",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  }
);

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/secrets", (req, res) => {
  User.find({ secret: { $ne: null } }, (err, foundUser) => {
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        console.log(foundUser);
        res.render("secrets", { usersWithSecrets: foundUser });
      }
    }
  });
});

app.get("/submit", (req, res) => {
  // If the user is authenticated
  if (req.isAuthenticated()) {
    res.render("submit");
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
      // Use passport to authenticate the user using the local strategy
      // Authenticate the user on our server
      /* Parameters
      1) The type of strategy that we want to authenticate the user with
      */
      // If the callback function gets called, the authentication was successful
      passport.authenticate("local")(req, res, () => {
        res.redirect("/secrets");
      });
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
      // Use passport to authenticate the user that is trying to login using the local strategy
      // Authenticate the user on our server
      /* Parameters
      1) The type of strategy that we want to authenticate the user with
      */
      // If the callback function gets called, the authentication was successful
      passport.authenticate("local")(req, res, () => {
        res.redirect("/secrets");
      });
    }
  });
});

app.post("/submit", (req, res) => {
  const userSecret = req.body.secret;

  User.findById(req.user._id, (err, foundUser) => {
    if (err) {
      console.log(err);
    } else {
      // If there was a found user
      if (foundUser) {
        // Assign the value of the user secret ti the secret property inside the foundUser document
        foundUser.secret = userSecret;
        foundUser.save(() => {
          res.redirect("/secrets");
        });
      }
    }
  });
});

app.listen(3000, () => {
  console.log("Server started on port 3000");
});
