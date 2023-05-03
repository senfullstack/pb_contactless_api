const axios = require("axios");
require("dotenv").config();

let headers = {
  "Content-Type": "application/x-www-form-urlencoded",
  "x-app-key": process.env.AppKey,
};

const OAuthResBody = {
  username: process.env.OAuthUserName,
  password: process.env.OAuthPassword,
  grant_type: process.env.GrantType,
};

let operaAxios = axios.create({
  baseURL: process.env.BaseUrl,
  headers: { ...headers },
});

const basicAuth = {
  username: process.env.AuthUserName,
  password: process.env.AuthPassword,
};

const getOAuth = async () => {
  const response = await operaAxios.post(
    `${process.env.BaseUrl}/oauth/v1/tokens`,
    new URLSearchParams(OAuthResBody),
    {
      auth: basicAuth,
    }
  );
  return await response.data.access_token;
};

module.exports = {
  getOAuth: getOAuth,
};
