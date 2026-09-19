import { Box, Grid } from '@mui/material';
import Dialog from '@components/dialog';
import Typography from '@components/typography';
import Button from '@components/button';
import ScrollableTabs from '@components/scrollable_tabs';
import useMonths15h from './useMonths15h';

type Months15hProps = {
  open: boolean;
  onClose: VoidFunction;
};

/**
 * «Meses de 15 horas» — el engranaje de Solicitudes de precursor auxiliar.
 *
 * Los meses en rejilla y no en una lista desplegable con casillas: son doce, se
 * eligen dos o tres, y en el desplegable había que abrirlo para saber cuáles
 * están marcados. Aquí se ven todos a la vez, que es justo lo que hace falta
 * para cuadrarlos.
 *
 * Es la misma rejilla del selector de mes de Exhibidores y Salidas (mismo
 * botón, mismas tres columnas), para que un mes marcado se lea igual en toda
 * la app.
 */
const Months15h = ({ open, onClose }: Months15hProps) => {
  const {
    years,
    yearIndex,
    setYearIndex,
    months,
    selected,
    readOnly,
    dirty,
    saving,
    handleToggleMonth,
    handleClearYear,
    handleSave,
  } = useMonths15h({ open });

  const handleConfirm = async () => {
    const guardado = await handleSave();

    if (guardado) onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <Typography className="h2" color="var(--ink)">
          Meses de 15 horas
        </Typography>
        <Typography className="body-small-regular" color="var(--ink-2)">
          Marca los meses en que el precursorado auxiliar puede hacerse con 15
          horas. Solo en esos meses la solicitud deja elegir entre 15 y 30; en
          el resto son 30 y no se pregunta.
        </Typography>
      </Box>

      {years.length > 1 && (
        <ScrollableTabs
          tabs={years.map((value) => ({ label: `Año ${value}` }))}
          value={yearIndex}
          onChange={setYearIndex}
          variant="scrollable"
          hideScrollButtons
        />
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Grid container spacing={1}>
          {months.map((record) => {
            const marcado = selected.includes(record.value);

            return (
              <Grid size={{ mobile: 4 }} key={record.value}>
                {/* Marcado, relleno; sin marcar, con contorno. En el selector
                    de mes de Salidas los no elegidos van sin contorno, pero
                    allí se elige UNO: aquí se marcan varios, y sin borde los
                    doce meses parecen texto y no algo que se pulsa. */}
                <Button
                  variant={marcado ? 'main' : 'tertiary'}
                  disableAutoStretch={false}
                  disabled={readOnly}
                  onClick={() => handleToggleMonth(record.value)}
                  ariaLabel={`${record.label} de ${record.year}${
                    marcado ? ', marcado como de 15 horas' : ''
                  }`}
                  sx={{ width: '100%', minHeight: '40px', height: '40px' }}
                >
                  {record.label}
                </Button>
              </Grid>
            );
          })}
        </Grid>

        {/* El año de servicio va de septiembre a agosto, así que la rejilla
            empieza en septiembre y no en enero: se dice, porque una rejilla de
            meses que no empieza por enero desconcierta si no se avisa.

            «Quitar todos» va aquí y no en el pie: actúa sobre ESTA rejilla, no
            sobre el diálogo, y en el pie de un móvil no cabía con los otros dos
            botones — «Guardar», que es a lo que se viene, caía a una segunda
            fila él solo. */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            minHeight: '32px',
          }}
        >
          <Typography className="label-small-regular" color="var(--ink-3)">
            {readOnly
              ? 'Este año de servicio ya ha terminado: se puede consultar, pero no cambiar.'
              : `De septiembre a agosto. ${
                  selected.length === 0
                    ? 'Ningún mes marcado.'
                    : selected.length === 1
                      ? '1 mes marcado.'
                      : `${selected.length} meses marcados.`
                }`}
          </Typography>

          {!readOnly && selected.length > 0 && (
            <Button
              variant="small"
              color="red"
              disableAutoStretch
              onClick={handleClearYear}
            >
              Quitar todos
            </Button>
          )}
        </Box>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '8px',
        }}
      >
        <Button variant="tertiary" disableAutoStretch onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="main"
          disableAutoStretch
          disabled={!dirty || saving}
          onClick={handleConfirm}
        >
          Guardar
        </Button>
      </Box>
    </Dialog>
  );
};

export default Months15h;
