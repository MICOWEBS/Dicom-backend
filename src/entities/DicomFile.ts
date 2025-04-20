import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { User } from './User';

@Entity()
export class DicomFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  filename: string;

  @Column()
  cloudinaryPublicId: string;

  @Column()
  cloudinarySecureUrl: string;

  @Column('jsonb', { nullable: true })
  metadata: {
    patientId?: string;
    studyDate?: string;
    modality?: string;
    [key: string]: any;
  };

  @Column('jsonb', { nullable: true })
  aiResults: {
    predictions?: any[];
    annotations?: any[];
    [key: string]: any;
  };

  @ManyToOne(() => User, user => user.dicomFiles)
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 