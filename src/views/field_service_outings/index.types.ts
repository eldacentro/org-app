export type OutingPDFItem = {
  id: string;
  time: string;         // Ej: "10:00"
  location: string;     // Ej: "Salón del Reino"
  brotherName: string;  // Ej: "J. Pérez" o "Sin asignar"
  isAssigned: boolean;
  isCancelled: boolean;
};

export type CalendarCellPDF = 
  | { type: 'empty'; id: string }
  | { type: 'day'; dayNum: number; outings: OutingPDFItem[] };

export type OutingsPDFProps = {
  monthName: string;
  cong_name: string;
  cells: CalendarCellPDF[];
  updatedAt?: string;
  lastModifiedBy?: string;
};
