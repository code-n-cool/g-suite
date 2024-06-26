/*
POST:         ...
FILE:         drive_list.js
COPYRIGHT:    (c)2023 CyberWeb Consulting LLC
LICENSE:      apache.org/licenses/LICENSE-2.0
*/

const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');

const CREDENTIALS_PATH = path.join(process.cwd(), 'client_secret.json');
const TOKEN_PATH = path.join(process.cwd(), 'storage.json');
const SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly'];


/**
 * Load any saved credentials or null
 *
 * @return {(Promise<JSONClient|null>)}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}


/**
 * Save credentials
 *
 * @param {JSONClient} client credentials
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
    access_token: client.credentials.access_token,
    token_expiry: client.credentials.token_expiry,
    scopes: client.credentials.scopes,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}


/**
 * Authorize user credentials, authenticating user first if necessary
 *
 * @return {JSONClient} client credentials
 */
async function authorize() {
  var client = await loadSavedCredentialsIfExist();
  if (client) return client;
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) await saveCredentials(client);
  return client;
}


/**
 * Request file lookup via Google Drive API
 *
 * @param {JSONClient} authClient (client credentials)
 */
async function listFiles(authClient) {
  const drive = google.drive({version: 'v3', auth: authClient});
  const res = await drive.files.list();
  const files = res.data.files || [];
  for (let file of files) {
    console.log(`${file.name} (${file.mimeType})`);
  }
}

authorize().then(listFiles).catch(console.error);
