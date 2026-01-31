// Minimal Firebase Functions entry
const functions = require('firebase-functions');

exports.helloWorld = functions.https.onRequest((req, res) => {
  res.send('Hello from Firebase Functions!');
});
