const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

// Firebase Initialization
try {
  const serviceAccountKey = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountKey)
  });
  console.log("Firebase Initialized Successfully!");
} catch (error) {
  console.error("Firebase Initialization Error:", error.message);
}

// 1. Root Route par Website / Form dikhayega (Bina Postman ke seedha browser se bhejne ke liye)
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>FCM Notification Sender</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: Arial, sans-serif; background: #0f172a; color: #fff; padding: 20px; margin: 0; }
        .container { max-width: 400px; margin: 40px auto; background: #1e293b; padding: 20px; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); }
        h2 { text-align: center; color: #38bdf8; margin-bottom: 20px; }
        label { display: block; margin-top: 12px; font-size: 14px; color: #cbd5e1; }
        input, textarea { width: 100%; padding: 10px; margin-top: 5px; background: #0f172a; border: 1px solid #475569; color: #fff; border-radius: 5px; box-sizing: border-box; font-size: 14px; }
        button { width: 100%; background: #38bdf8; color: #0f172a; border: none; padding: 12px; margin-top: 20px; font-size: 16px; font-weight: bold; border-radius: 5px; cursor: pointer; }
        button:hover { background: #0ea5e9; }
        #result { margin-top: 15px; text-align: center; font-size: 14px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>🚀 FCM Sender Panel</h2>
        <form id="notifForm">
          <label>Receiver FCM Token:</label>
          <textarea id="token" rows="3" required placeholder="Yahan target user ka FCM token paste karein"></textarea>
          
          <label>Notification Title:</label>
          <input type="text" id="title" value="Hello from Server!" required>
          
          <label>Message Text:</label>
          <input type="text" id="message" value="Yeh raha aapka custom message." required>
          
          <button type="submit" id="sendBtn">Send Notification</button>
        </form>
        <div id="result"></div>
      </div>

      <script>
        document.getElementById('notifForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const resDiv = document.getElementById('result');
          const btn = document.getElementById('sendBtn');
          resDiv.innerText = 'Sending...';
          resDiv.style.color = '#facc15';
          btn.disabled = true;
          
          const data = {
            receiverToken: document.getElementById('token').value,
            title: document.getElementById('title').value,
            messageText: document.getElementById('message').value,
            senderName: 'Web Admin'
          };

          try {
            const response = await fetch('/send-user-to-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });
            const result = await response.json();
            if(result.success) {
              resDiv.style.color = '#4ade80';
              resDiv.innerText = 'Notification Sent Successfully! 🎉';
            } else {
              resDiv.style.color = '#f87171';
              resDiv.innerText = 'Error: ' + (result.error || 'Failed to send');
            }
          } catch(err) {
            resDiv.style.color = '#f87171';
            resDiv.innerText = 'Network Error! Server check karein.';
          } finally {
            btn.disabled = false;
          }
        });
      </script>
    </body>
    </html>
  `);
});

// 2. Notification Bhejne ka API Route
app.post('/send-user-to-user', async (req, res) => {
  const { senderName, receiverToken, title, messageText, additionalData } = req.body;

  if (!receiverToken) {
    return res.status(400).json({ success: false, error: 'Receiver Token is missing' });
  }

  const message = {
    notification: {
      title: title || 'New Message',
      body: messageText || 'Aapko ek naya message mila hai.'
    },
    data: {
      senderName: senderName || 'User',
      ...(additionalData || {})
    },
    token: receiverToken,
  };

  try {
    const response = await admin.messaging().send(message);
    res.status(200).json({ success: true, messageId: response });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
