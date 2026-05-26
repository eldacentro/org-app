export type ExhibitorPDFTurnItem = {
  id: string;
  time: string;
  location: string;
  assignments: {
    name: string;
    isResponsible: boolean;
  }[];
  isCancelled: boolean;
  isAssigned: boolean;
};

export type ExhibitorPDFCell =
  | {
      type: 'empty';
    }
  | {
      type: 'day';
      dayNum: number;
      turns: ExhibitorPDFTurnItem[];
    };

export type ExhibitorPDFProps = {
  monthName: string;
  cong_name: string;
  weekdays: string[];
  cells: ExhibitorPDFCell[];
  updatedAt?: string;
  lastModifiedBy?: string;
};
