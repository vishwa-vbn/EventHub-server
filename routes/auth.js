const router = require("express").Router();
const passport = require("passport");

router.get("/login/success", (req, res) => {
  if (req.user) {
    return res.status(200).json({
      error: false,
      message: "Successfully Logged In",
      user: req.user,
    });
  } else {
    return res.status(403).json({ error: true, message: "Not Authorized" });
  }
});

router.get("/login/failed", (req, res) => {
  return res.status(401).json({
    error: true,
    message: "Log in failure",
  });
});

router.get("/google", passport.authenticate("google", ["profile", "email"]));

router.get("/google/callback", (req, res, next) => {
  passport.authenticate("google", (err, user) => {
    if (err) {
      return res.redirect("/login/failed");
    }
    if (!user) {
      return res.redirect("/login/failed");
    }
    req.logIn(user, (err) => {
      if (err) {
        return res.redirect("/login/failed");
      }
      return res.redirect(process.env.CLIENT_URL);
    });
  })(req, res, next);
});

router.get("/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({
          error: true,
          message: "Logout failed",
        });
      }
      return res.redirect(process.env.CLIENT_URL);
    });
  });

module.exports = router;
