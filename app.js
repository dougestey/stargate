require('dotenv-safe').config();

const SSO = require('eve-sso-simple');
const ESI = require('eve-swagger-simple');
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const app = express();

app.use(cors({ origin: process.env.ALLOWED_FQDN, credentials: true }));

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
  }, req, res, async(accessTokens, characterToken) => {
    try {
      req.session.resolved = await ESI.request(`/characters/${characterToken.CharacterID}`);
    } catch(e) {
      console.error(e);
      return res.status(500).json(e);
    }

    req.session.accessTokens = accessTokens;
    req.session.characterToken = characterToken;
    req.session.resolved.character_id = characterToken.CharacterID;

    res.redirect(process.env.REDIRECT_URL);
  });
});

app.get('/whoami', (req, res) => {
  if (!req.session || !req.session.resolved)
    return res.status(401).json({ message: 'Access denied. '});

  return res.status(200).json(req.session.resolved);
});

app.get('/logout', (req, res) => {
  if (req.session)
    req.session.destroy();

  return res.send(401);
});

app.listen(process.env.APP_PORT, () => console.log(`Stargate is now accepting connections at ${process.env.APP_URL}:${process.env.APP_PORT}`));
