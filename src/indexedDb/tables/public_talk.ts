import { Table } from 'dexie';
import { PublicTalkOverrideType, PublicTalkType } from '@definition/public_talks';

export type PublicTalkTable = {
  public_talks: Table<PublicTalkType>;
};

export const publicTalkSchema = {
  public_talks: '&talk_number, talk_title',
};

export type PublicTalkOverrideTable = {
  public_talks_override: Table<PublicTalkOverrideType, string>;
};

export const publicTalkOverrideSchema = {
  public_talks_override: 'id',
};
