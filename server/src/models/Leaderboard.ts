import { Schema, model, Document } from 'mongoose';

export interface IPlayerScore {
  userId: string; // or username if guest
  username: string; // redundant but useful for display
  score: number;
  answers: {
    questionId: string;
    optionId: string;
    isCorrect: boolean;
    timeTaken: number;
  }[];
}

export interface ILeaderboard extends Document {
  quizId: Schema.Types.ObjectId;
  roomId: string;
  isActive: boolean;
  players: IPlayerScore[];
  currentQuestionIndex: number;
  createdAt: Date;
}

const playerScoreSchema = new Schema<IPlayerScore>({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  score: { type: Number, default: 0 },
  answers: [{
    questionId: { type: String },
    optionId: { type: String },
    isCorrect: { type: Boolean },
    timeTaken: { type: Number }
  }]
});

const leaderboardSchema = new Schema<ILeaderboard>({
  quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
  roomId: { type: String, required: true, index: true },
  isActive: { type: Boolean, default: true },
  players: [playerScoreSchema],
  currentQuestionIndex: { type: Number, default: -1 },
  createdAt: { type: Date, default: Date.now }
});

export const Leaderboard = model<ILeaderboard>('Leaderboard', leaderboardSchema);
