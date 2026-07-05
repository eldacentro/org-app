import { S21CardData } from '@definition/report';

export type TemplateS21DocMultiProps = {
  publishers: [S21CardData, S21CardData][];
  lang: string;
};
