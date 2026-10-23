const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

// Firebase Admin SDK Initialization
try {
  const serviceAccountKey = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountKey)
  });
  console.log("Firebase Initialized Successfully!");
} catch (error) {
  console.error("Firebase Initialization Error:", error.message);
}

// 1. Root Route ('/') - Web Interface for Sending Custom Notifications
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>FCM Notification Sender Panel</title>
      <style>
        * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
        .card { background-color: #1e293b; padding: 24px; border-radius: 12px; width: 100%; max-width: 480px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4); border: 1px solid #334155; }
        h2 { text-align: center; color: #38bdf8; margin-top: 0; margin-bottom: 20px; font-size: 22px; }
        label { display: block; margin-top: 14px; font-size: 13px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
        input, textarea { width: 100%; padding: 10px 12px; margin-top: 6px; background-color: #0f172a; border: 1px solid #475569; color: #f8fafc; border-radius: 6px; font-size: 14px; outline: none; }
        input:focus, textarea:focus { border-color: #38bdf8; }
        button { width: 100%; background-color: #38bdf8; color: #0f172a; border: none; padding: 12px; margin-top: 24px; font-size: 15px; font-weight: 700; border-radius: 6px; cursor: pointer; transition: background 0.2s; }
        button:hover { background-color: #0ea5e9; }
        button:disabled { opacity: 0.6; cursor: not-allowed; }
        #result { margin-top: 18px; text-align: center; font-size: 14px; font-weight: 600; min-height: 20px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>🚀 FCM Sender Panel</h2>
        <form id="notifForm">
          <label>Receiver FCM Token:</label>
          <textarea id="token" rows="3" required placeholder="Paste target device FCM token here"></textarea>
          
          <label>Notification Title:</label>
          <input type="text" id="title" value="Test Notification" required>
          
          <label>Message Text:</label>
          <textarea id="message" rows="2" required>This is a custom message sent from server panel.</textarea>
          
          <button type="submit" id="sendBtn">Send Notification</button>
        </form>
        <div id="result"></div>
      </div>

      <script>
        document.getElementById('notifForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const resDiv = document.getElementById('result');
          const btn = document.getElementById('sendBtn');
          
          resDiv.innerText = 'Sending notification...';
          resDiv.style.color = '#facc15';
          btn.disabled = true;
          
          const payload = {
            receiverToken: document.getElementById('token').value.trim(),
            title: document.getElementById('title').value.trim(),
            messageText: document.getElementById('message').value.trim(),
            senderName: 'Web Admin'
          };

          try {
            const response = await fetch('/send-user-to-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            if (result.success) {
              resDiv.style.color = '#4ade80';
              resDiv.innerText = '✅ Notification Sent Successfully!';
            } else {
              resDiv.style.color = '#f87171';
              resDiv.innerText = '❌ Failed: ' + (result.error || 'Unknown error');
            }
          } catch (err) {
            resDiv.style.color = '#f87171';
            resDiv.innerText = '❌ Network Error! Please check server logs.';
          } finally {
            btn.disabled = false;
          }
        });
      </script>
    </body>
    </html>
  `);
});

// 2. Endpoint: Send User-to-User FCM Notification
app.post('/send-user-to-user', async (req, res) => {
  const { senderName, receiverToken, title, messageText, additionalData } = req.body;

  if (!receiverToken) {
    return res.status(400).json({ success: false, error: 'Receiver Token is missing' });
  }

  const message = {
    notification: {
      title: title || 'New Notification',
      body: messageText || 'You have received a new message.'
    },
    data: {
      senderName: senderName || 'User',
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
      ...(additionalData || {})
    },
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        priority: 'high',
        defaultSound: true,
        defaultVibrateTimings: true,
        visibility: 'public'
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          contentAvailable: true
        }
      },
      headers: {
        'apns-priority': '10'
      }
    },
    token: receiverToken,
  };

  try {
    const response = await admin.messaging().send(message);
    res.status(200).json({ success: true, messageId: response });
  } catch (error) {
    console.error('Error sending FCM message:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
