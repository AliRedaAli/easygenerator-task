import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema.js';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  findByEmail(email: string) {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  findById(id: string) {
    return this.userModel.findById(id).exec();
  }

  create(name: string, email: string, passwordHash: string) {
    return this.userModel.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
    });
  }

  setRefreshTokenHash(userId: string, refreshTokenHash: string | null) {
    return this.userModel.findByIdAndUpdate(userId, { refreshTokenHash }).exec();
  }
}
