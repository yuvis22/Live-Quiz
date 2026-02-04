import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email?: string;
  avatar?: string;
  createdAt: Date;
}

const userSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true },
  email: { type: String, unique: true, sparse: true },
  avatar: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export const User = model<IUser>('User', userSchema);
