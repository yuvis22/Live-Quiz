import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupSocket } from './socket/index';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all for now, restrict in production
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/live-quiz";

app.use(cors());
app.use(express.json());

import { Quiz } from './models/Quiz';

app.get('/', (req, res) => {
  res.send('Live Quiz API is running');
});

// Seed Route for Demo
app.post('/api/seed', async (req, res) => {
  try {
    const { userId } = req.body;
    const demoQuiz = {
      title: "General Knowledge Demo",
      hostId: userId || "anonymous", // Use Clerk ID if provided
      questions: [
        {
          id: "q1",
          text: "What is the capital of France?",
          options: [
            { id: "A", text: "Berlin" },
            { id: "B", text: "Madrid" },
            { id: "C", text: "Paris" },
            { id: "D", text: "London" }
          ],
          correctOptionId: "C",
          timeLimit: 15
        },
        {
          id: "q2",
          text: "Which planet is known as the Red Planet?",
          options: [
            { id: "A", text: "Mars" },
            { id: "B", text: "Venus" },
            { id: "C", text: "Jupiter" },
            { id: "D", text: "Saturn" }
          ],
          correctOptionId: "A",
          timeLimit: 15
        },
        {
          id: "q3",
          text: "What is 2 + 2?",
          options: [
            { id: "A", text: "3" },
            { id: "B", text: "4" },
            { id: "C", text: "5" },
            { id: "D", text: "22" }
          ],
          correctOptionId: "B",
          timeLimit: 10
        }
      ]
    };
    
    // Check if exists or just create new one
    const quiz = new Quiz(demoQuiz);
    await quiz.save();
    res.json({ quizId: quiz._id });
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

// Get Quizzes by Host
app.get('/api/quizzes/:userId', async (req, res) => {
  try {
    const quizzes = await Quiz.find({ hostId: req.params.userId }).sort({ createdAt: -1 });
    res.json(quizzes);
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

import { Leaderboard } from './models/Leaderboard';

// Get Past Results
app.get('/api/results/:userId', async (req, res) => {
  try {
     // 1. Find all quizzes by this host
     const userQuizzes = await Quiz.find({ hostId: req.params.userId }).select('_id title');
     const quizIds = userQuizzes.map(q => q._id);

     // 2. Find leaderboards/results for these quizzes
     const results = await Leaderboard.find({ quizId: { $in: quizIds }, isActive: false })
       .sort({ createdAt: -1 })
       .populate('quizId', 'title') // Populate quiz title
       .limit(20);

     res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});



// Create New Quiz
app.post('/api/quizzes', async (req, res) => {
  try {
    const { title, userId, questions } = req.body;
    
    const newQuiz = new Quiz({
      title,
      hostId: userId,
      questions: questions.map((q: any) => ({
        ...q,
        id: new mongoose.Types.ObjectId().toString() // Ensure IDs are generated
      }))
    });

    await newQuiz.save();
    res.json({ success: true, quizId: newQuiz._id });
  } catch (err) {
    console.error('Error creating quiz:', err);
    res.status(500).json({ error: 'Failed to create quiz' });
  }
});

// Setup Socket.io logic
setupSocket(io);

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    httpServer.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });
