const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();

// CORS & Middleware setup
app.use(cors());
app.use(express.json());

// Firebase Admin Initialize karein (Environment Variable ke zariye)
try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("Firebase Admin successfully initialized.");
} catch (error) {
  console.error("Firebase Initialization Error. Check FIREBASE_SERVICE_ACCOUNT env variable:", error.message);
}

// 1. Basic Health Check Endpoint
app.get('/', (req, res) => {
  res.send('FCM User-to-User Notification Server is Running!');
});

// 2. Normal Single Device Notification (Simple Direct Test)
app.post('/send-normal', async (req, res) => {
  const { receiverToken, title, body } = req.body;

  if (!receiverToken || !title || !body) {
    return res.status(400).json({ success: false, message: 'receiverToken, title, aur body required hain.' });
  }

  const message = {
    notification: { title, body },
    token: receiverToken
  };

  try {
    const response = await admin.messaging().send(message);
    return res.status(200).json({ success: true, messageId: response });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 3. User A to User B Notification Endpoint
// User A ka app iss endpoint par req bhejega, target (User B) ke FCM token par notification jayegi
app.post('/send-user-to-user', async (req, res) => {
  const { 
    senderName,        // User A ka naam (e.g. "Rahul")
    senderId,          // User A ki ID
    receiverToken,     // User B ka FCM Token
    title,             // Notification Title
    messageText,       // Notification Message Body
    additionalData     // Custom Data (jaise chat_id, page_type, etc.)
  } = req.body;

  if (!receiverToken || !messageText) {
    return res.status(400).json({ 
      success: false, 
      message: 'receiverToken aur messageText required hain.' 
    });
  }

  const notificationTitle = title || `${senderName || 'Kisi user'} ne aapko message bheja`;

  const payload = {
    notification: {
      title: notificationTitle,
      body: messageText
    },
    data: {
      senderId: String(senderId || ''),
      senderName: String(senderName || ''),
      click_action: 'FLUTTER_NOTIFICATION_CLICK', // Ya React Native/Android action
      ...(additionalData || {})
    },
    token: receiverToken
  };

  try {
    const response = await admin.messaging().send(payload);
    return res.status(200).json({ 
      success: true, 
      message: 'Notification User B ko bhej di gayi hai.',
      messageId: response 
    });
  } catch (error) {
    console.error('FCM Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Notification bhejne me dikkat aayi.',
      error: error.message 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
