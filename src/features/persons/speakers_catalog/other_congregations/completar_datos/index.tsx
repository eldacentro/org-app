import { Box } from '@mui/material';
import Button from '@components/button';
import InfoTip from '@components/info_tip';
import Typography from '@components/typography';
import useCompletar from './useCompletar';

/**
 * La tira de «faltan datos», arriba del catálogo.
 *
 * Sale sola cuando hay algo que rellenar y desaparece cuando no queda nada, que
 * es lo que hace que no estorbe: un botón fijo en la cabecera diría lo mismo
 * todos los días del año.
 *
 * El número y el circuito se quedaron en blanco por dos motivos que ya están
 * arreglados para las nuevas —el formulario de añadir a mano tiraba el número
 * que se escribía, y el buscador no devuelve número ninguno—, pero las que ya
 * estaban se quedaron como estaban. Esto es para esas.
 */
const CompletarDatos = () => {
  const {
    incompletas,
    hallazgos,
    encontradas,
    perdidas,
    pendientes,
    buscando,
    guardando,
    handleBuscar,
    handleGuardar,
    handleDescartar,
  } = useCompletar();

  if (incompletas.length === 0 && !hallazgos) return null;

  return (
    <InfoTip isBig={false} color="warning">
      <Box
        component="span"
        sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
      >
        <Box
          component="span"
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            width: '100%',
          }}
        >
          <Typography
            component="span"
            className="body-regular"
            sx={{ color: 'var(--orange-dark)' }}
          >
            {incompletas.length === 1
              ? 'A 1 congregación le falta el número o el circuito.'
              : `A ${incompletas.length} congregaciones les falta el número o el circuito.`}
          </Typography>

          {!hallazgos && (
            <Button
              variant="small"
              color="orange"
              disabled={buscando}
              onClick={handleBuscar}
            >
              {buscando ? 'Buscándolos…' : 'Buscarlos'}
            </Button>
          )}
        </Box>

        {/* Lo encontrado, antes de guardar nada. Se enseña entero —qué
            congregación y qué se le va a poner— porque esto escribe en una
            tabla que se sincroniza con toda la congregación, y un número
            equivocado ahí no lo vuelve a mirar nadie. */}
        {encontradas.map((hallazgo) => (
          <Typography
            key={hallazgo.id}
            component="span"
            className="label-small-regular"
            sx={{ color: 'var(--orange-dark)' }}
          >
            {`${hallazgo.nombre} — ${[
              hallazgo.numero && `número ${hallazgo.numero}`,
              hallazgo.circuito && `circuito ${hallazgo.circuito}`,
            ]
              .filter(Boolean)
              .join(', ')}`}
          </Typography>
        ))}

        {/* Las que no se han podido resolver también se dicen: si no, se
            guardan cuatro de seis y parece que están las seis. */}
        {perdidas.length > 0 && (
          <Typography
            component="span"
            className="label-small-regular"
            sx={{ color: 'var(--ink-3)' }}
          >
            {`Sin encontrar: ${perdidas
              .map((hallazgo) => hallazgo.nombre)
              .join(', ')}. Escríbelos a mano desde el lápiz de cada una.`}
          </Typography>
        )}

        {/* Si el corte por tanda ha dejado fuera algunas, se dice. Callarlo
            haría creer que ya están todas. */}
        {hallazgos && pendientes > 0 && (
          <Typography
            component="span"
            className="label-small-regular"
            sx={{ color: 'var(--ink-3)' }}
          >
            {pendientes === 1
              ? 'Queda 1 congregación por mirar. Guarda estas y vuelve a pulsar dentro de unos minutos.'
              : `Quedan ${pendientes} congregaciones por mirar. Guarda estas y vuelve a pulsar dentro de unos minutos.`}
          </Typography>
        )}

        {hallazgos && (
          <Box
            component="span"
            sx={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}
          >
            <Button
              variant="small"
              disabled={guardando || encontradas.length === 0}
              onClick={handleGuardar}
            >
              {guardando ? 'Guardando…' : 'Guardar lo encontrado'}
            </Button>

            <Button variant="small" color="orange" onClick={handleDescartar}>
              Ahora no
            </Button>
          </Box>
        )}
      </Box>
    </InfoTip>
  );
};

export default CompletarDatos;
