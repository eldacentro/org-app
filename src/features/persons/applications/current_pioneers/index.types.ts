export type CurrentPioneerEntry = {
  person_uid: string;
  name: string;
  female: boolean;
};

export type CurrentPioneersProps = {
  pioneers: CurrentPioneerEntry[];
};
