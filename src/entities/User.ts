import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { DicomFile } from './DicomFile';

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ default: 'free' })
  subscriptionTier: SubscriptionTier;

  @Column({ nullable: true })
  stripeCustomerId?: string;

  @Column({ nullable: true })
  stripeSubscriptionId?: string;

  @OneToMany(() => DicomFile, dicomFile => dicomFile.user)
  dicomFiles: DicomFile[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  constructor() {
    this.subscriptionTier = 'free';
  }
} 