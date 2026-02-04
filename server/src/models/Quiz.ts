import { Schema, model, Document } from 'mongoose';

export interface IOption {
  text: string;
  id: string; // concise id like 'A', 'B' or uuid
}

export interface IQuestion {
  id: string;
  text: string;
  options: IOption[];
  correctOptionId: string;
  timeLimit?: number; // defaults to 15s if not set
}

export interface IQuiz extends Document {
  title: string;
  hostId: Schema.Types.ObjectId;
  questions: IQuestion[];
  createdAt: Date;
}

const optionSchema = new Schema<IOption>({
  text: { type: String, required: true },
  id: { type: String, required: true }
});

const questionSchema = new Schema<IQuestion>({
  id: { type: String, required: true },
  text: { type: String, required: true },
  options: [optionSchema],
  correctOptionId: { type: String, required: true },
  timeLimit: { type: Number, default: 15 }
});

const quizSchema = new Schema<IQuiz>({
  title: { type: String, required: true },
  hostId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  questions: [questionSchema],
  createdAt: { type: Date, default: Date.now }
});

export const Quiz = model<IQuiz>('Quiz', quizSchema);
