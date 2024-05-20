import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import validator from 'validator';

export interface IUser extends Document {
  email: string;
  password: string;
  activeChats: string[]; 
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema: Schema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        validate: [validator.isEmail, 'Invalid email']
    },
    password: { type: String, required: true }
});

// Pre-save hook to hash the password
userSchema.pre<IUser>('save', async function (next) {
    if (this.isModified('password') || this.isNew) {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(this.password, salt);
        this.password = hash;
    }
    next();
});

// Method to check the password on login
userSchema.methods.comparePassword = async function (candidatePassword: string) {
    return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model<IUser>('User', userSchema);

export default User;
