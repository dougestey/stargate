require('dotenv-safe').config();

const SSO = require('eve-sso-simple');
const express = require('express');
const session = require('express-session');
const app = express();

app.use(session({
  secret: process.env.APP_SESSION_SECRET,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
}));

app.get('/authorize', (req, res) => {
  return SSO.login({
    client_id: process.env.EVE_CLIENT_ID,
    client_secret: process.env.EVE_SECRET_KEY,
    redirect_uri: `${process.env.APP_URL}/token`,
  }, res);
});

app.get('/token', (req, res) => {
  SSO.getTokens({
    client_id: process.env.EVE_CLIENT_ID,
    client_secret: process.env.EVE_SECRET_KEY,
  }, req, res, (accessTokens, characterToken) => {
    req.session.accessTokens = accessTokens;
    req.session.characterToken = characterToken;
    req.session.authenticated = true;

    res.redirect(process.env.REDIRECT_URL);
  });
});

app.get('/whoami', (req, res) => {
  if (!req.session || !req.session.characterToken)
    return res.status(401).json({ message: 'Access denied. '});

  return res.status(200).json(characterToken);
});

app.listen(process.env.APP_PORT, () => console.log(`Stargate is now accepting connections at ${process.env.APP_URL}:${process.env.APP_PORT}`));
