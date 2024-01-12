const admin = require('firebase-admin');

const private_key = require('./firebase_admin_sdk_private-key.json')

admin.initializeApp({
    credential:admin.credential.cert(private_key),
    databaseURL: 'https://silwalk-inc-default-rtdb.firebaseio.com'
})
module.exports=admin;