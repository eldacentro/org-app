import { Table } from 'dexie';
import { SongOverrideType, SongType } from '@definition/songs';

export type SongTable = {
  songs: Table<SongType>;
};

export const songSchema = {
  songs: '&song_number, song_title',
};

export type SongOverrideTable = {
  songs_override: Table<SongOverrideType, string>;
};

export const songOverrideSchema = {
  songs_override: 'id',
};
