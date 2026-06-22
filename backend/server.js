const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB error:', err));

// ── SCHEMAS ──────────────────────────────────────────

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const conversationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // which user owns this
  messages: [{ role: String, content: String }],
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Conversation = mongoose.model('Conversation', conversationSchema);

// ── MIDDLEWARE ────────────────────────────────────────

// This runs before protected routes to verify the JWT
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // "Bearer <token>"
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId; // attach userId to request
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ── AUTH ROUTES ───────────────────────────────────────

// REGISTER
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // check if user already exists
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    // hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // save user
    const user = new User({ email, password: hashedPassword });
    await user.save();

    res.json({ message: 'Account created successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// LOGIN
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // find user
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid email or password' });

    // check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid email or password' });

    // create JWT
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, email: user.email });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── CHAT ROUTE (protected) ────────────────────────────

app.post('/api/chat', authMiddleware, async (req, res) => {
  try {
    const { messages, conversationId } = req.body;

    // Call Groq AI
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: messages
      })
    });

    const data = await response.json();
    const reply = data.choices[0].message.content;

    // Save to MongoDB with userId
    if (conversationId) {
      await Conversation.findByIdAndUpdate(conversationId, {
        $push: {
          messages: {
            $each: [
              { role: 'user', content: messages[messages.length - 1].content },
              { role: 'assistant', content: reply }
            ]
          }
        }
      });
      res.json({ reply, conversationId });
    } else {
      const conversation = new Conversation({
        userId: req.userId, // link to logged in user
        messages: []
      });
      await conversation.save();
      res.json({ reply, conversationId: conversation._id });
    }

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// GET past conversations for logged in user
app.get('/api/conversations', authMiddleware, async (req, res) => {
  try {
    const conversations = await Conversation.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: 'Could not fetch conversations.' });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on http://localhost:${process.env.PORT}`);
});