import { VisitingSpeakerType } from '@definition/visiting_speakers';

export type QuickAddSpeakerType = {
  open: boolean;
  onClose: VoidFunction;
  onCreated: (speaker: VisitingSpeakerType) => void;
};
