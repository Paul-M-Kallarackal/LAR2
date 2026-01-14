import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export enum EUCountry {
  GERMANY = 'DE',
  FRANCE = 'FR',
  SPAIN = 'ES',
  ITALY = 'IT',
  NETHERLANDS = 'NL',
  BELGIUM = 'BE',
  AUSTRIA = 'AT',
  PORTUGAL = 'PT',
  IRELAND = 'IE',
  GREECE = 'GR',
  POLAND = 'PL',
  SWEDEN = 'SE',
  FINLAND = 'FI',
  DENMARK = 'DK',
  CZECH_REPUBLIC = 'CZ',
  ROMANIA = 'RO',
  HUNGARY = 'HU',
  SLOVAKIA = 'SK',
  BULGARIA = 'BG',
  CROATIA = 'HR',
  SLOVENIA = 'SI',
  LITHUANIA = 'LT',
  LATVIA = 'LV',
  ESTONIA = 'EE',
  LUXEMBOURG = 'LU',
  CYPRUS = 'CY',
  MALTA = 'MT',
}

export const EU_COUNTRY_NAMES: Record<EUCountry, string> = {
  [EUCountry.GERMANY]: 'Germany',
  [EUCountry.FRANCE]: 'France',
  [EUCountry.SPAIN]: 'Spain',
  [EUCountry.ITALY]: 'Italy',
  [EUCountry.NETHERLANDS]: 'Netherlands',
  [EUCountry.BELGIUM]: 'Belgium',
  [EUCountry.AUSTRIA]: 'Austria',
  [EUCountry.PORTUGAL]: 'Portugal',
  [EUCountry.IRELAND]: 'Ireland',
  [EUCountry.GREECE]: 'Greece',
  [EUCountry.POLAND]: 'Poland',
  [EUCountry.SWEDEN]: 'Sweden',
  [EUCountry.FINLAND]: 'Finland',
  [EUCountry.DENMARK]: 'Denmark',
  [EUCountry.CZECH_REPUBLIC]: 'Czech Republic',
  [EUCountry.ROMANIA]: 'Romania',
  [EUCountry.HUNGARY]: 'Hungary',
  [EUCountry.SLOVAKIA]: 'Slovakia',
  [EUCountry.BULGARIA]: 'Bulgaria',
  [EUCountry.CROATIA]: 'Croatia',
  [EUCountry.SLOVENIA]: 'Slovenia',
  [EUCountry.LITHUANIA]: 'Lithuania',
  [EUCountry.LATVIA]: 'Latvia',
  [EUCountry.ESTONIA]: 'Estonia',
  [EUCountry.LUXEMBOURG]: 'Luxembourg',
  [EUCountry.CYPRUS]: 'Cyprus',
  [EUCountry.MALTA]: 'Malta',
};

@Entity('locations')
export class Location {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'enum', enum: EUCountry })
  country: EUCountry;

  @Column({ nullable: true })
  region: string;

  @CreateDateColumn()
  createdAt: Date;
}
