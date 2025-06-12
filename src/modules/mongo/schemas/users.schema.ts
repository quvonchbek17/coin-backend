import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type usersDocument = Users & Document;

@Schema({ timestamps: true })
export class Users {
  @Prop()
  id: string;

  @Prop({
    required: false,
  })
  username?: string;

  @Prop({
    required: false,
  })
  first_name?: string;

  @Prop({
    required: false,
  })
  last_name?: string;

  @Prop({
    default: 0
  })
  coins: number;

  @Prop({
    default: 1
  })
  level: number;

  @Prop({
    default: 0
  })
  totalTaps: number;

  @Prop({
    default: 1000
  })
  energy: number;

  @Prop({
    default: 1000
  })
  energyCapacity: number;

  @Prop({
    default: 1
  })
  clickQuality: number;

  @Prop({
    default: 1
  })
  energyQuality: number;

  @Prop({
    default: new Date()
  })
  lastClickDate: Date;

  @Prop({
    default: new Date()
  })
  lastCalculatedEnergyDate: Date;

  @Prop({
    required: false
  })
  lastActiveDate: Date;

  @Prop({
    required: false
  })
  refCode: string;
  @Prop({
    required: false
  })
  todayActiveMilliSeconds: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Users' }] })
  referredUsers: Types.ObjectId[];

}

export const usersSchema = SchemaFactory.createForClass(Users);
