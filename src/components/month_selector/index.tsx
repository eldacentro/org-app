import { Box, Grid } from '@mui/material';
import { useAppTranslation } from '@hooks/index';
import Button from '@components/button';
import CollapsibleSelector from '@components/collapsible_selector';
import ScrollableTabs from '@components/scrollable_tabs';

/**
 * Elegir mes y año.
 *
 * Lo usan Exhibidores y Salidas de predicación, que trabajan por MES en vez de
 * por semana. Estaba escrito a mano y COPIADO ENTERO entre las dos páginas
 * —cabecera, rejilla de meses y selector de año—, con su propio radio y sus
 * propios tamaños de letra puestos a pelo, así que no se parecía ni a su
 * gemelo ni a los selectores de semana.
 *
 * Ahora es el mismo `CollapsibleSelector` que los de semana: misma barra
 * plegada, mismo panel, mismo radio. Lo único propio es lo de dentro.
 */
const MonthSelector = ({
  monthNames,
  year,
  month,
  years,
  expanded,
  onToggle,
  onChange,
}: {
  monthNames: string[];
  year: number;
  /** 0..11 */
  month: number;
  years: number[];
  expanded: boolean;
  onToggle: () => void;
  onChange: (value: { year: number; month: number }) => void;
}) => {
  const { t } = useAppTranslation();

  return (
    <CollapsibleSelector
      title={t('tr_months', 'Meses')}
      valuePrefix={t('tr_month', 'Mes')}
      valueLabel={`${monthNames[month]} ${year}`}
      expanded={expanded}
      onToggle={onToggle}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* El año como PESTAÑAS, no como desplegable.
            Eran dos o tres años en una lista desplegable que, al abrirse, se
            plantaba encima de la rejilla de meses y tapaba justo lo que venías
            a elegir. Con dos opciones eso no compensa.
            Y de paso es el mismo control que usan los otros dos selectores de
            periodo de la app —el de semanas de Reuniones y el de
            Departamentos—, que ya enseñan el año en una tira de pestañas. */}
        <ScrollableTabs
          tabs={years.map((value) => ({ label: value.toString() }))}
          value={years.indexOf(year)}
          onChange={(index) => onChange({ year: years[index], month })}
          variant="scrollable"
          hideScrollButtons
        />

        <Grid container spacing={1}>
          {monthNames.map((name, index) => {
            const elegido = month === index;

            return (
              <Grid size={{ mobile: 4 }} key={name}>
                <Button
                  variant={elegido ? 'main' : 'secondary'}
                  disableAutoStretch={false}
                  onClick={() => {
                    onChange({ year, month: index });
                    onToggle();
                  }}
                  sx={{ width: '100%', minHeight: '36px', height: '36px' }}
                >
                  {name}
                </Button>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    </CollapsibleSelector>
  );
};

export default MonthSelector;
