import { ChangeEvent, RefObject } from 'react';
import { PublicTalkImportDiffType } from '@definition/public_talks';

export type PendingJwpubImportType = {
  langCode: string;
};

export type ImportTalksReturnType = {
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleOpenFilePicker: () => void;
  handleFileSelected: (event: ChangeEvent<HTMLInputElement>) => void;
  isParsing: boolean;
  isSaving: boolean;
  diffs: PublicTalkImportDiffType[] | null;
  handleCancel: () => void;
  handleConfirm: () => void;
};
