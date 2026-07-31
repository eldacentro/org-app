import {
  StyledCard,
  StyledCardContent,
  StyledBox,
  StyledIconWrapper,
  StyledBoxSpaceBetween,
  StyledImgContainer,
  StyledCardBox,
} from './user_card.styles';
import { Box } from '@mui/material';
import type { CustomUserCardProps } from './user_card.types';
import IconDelete from '../icons/IconDelete';
import IconArrowLink from '../icons/IconArrowLink';
import MiniChip from '../mini_chip';
import Typography from '../typography';
import UserCardMaleImg from '@assets/img/illustration_male.svg?component';
import UserCardFemaleImg from '@assets/img/illustration_female.svg?component';

/**
 * A custom user card component.
 *
 * @param name The name of the user.
 * @param type The type of the user card.
 * @param female Specifies if the user is female.
 * @param onClick Callback function to handle click events on the user card.
 * @param onDelete Callback function to handle delete events on the user card.
 * @param chipLabels Optional chip labels to display on the user card.
 * @param children Additional content to render inside the user card.
 */
const UserCard = ({
  name,
  type,
  female,
  onClick,
  onDelete,
  chipLabels = [],
  children,
  showArrow,
}: CustomUserCardProps) => {
  return (
    <StyledCardBox>
      <StyledCard sx={{ position: 'relative' }}>
        {/* Abrir la ficha, con el TECLADO también.
            La tarjeta entera era un `div` con `onClick`: con el ratón se abría
            y tabulando no había manera. En la lista de personas eso son CIEN
            filas seguidas por las que no se puede pasar, y es la pantalla que
            usa cualquiera que lleve las publicaciones o los informes.

            Va como una CAPA que cubre la tarjeta y no envolviéndola, por lo
            mismo que en las secciones plegables: dentro hay otro botón —el de
            borrar—, y un botón dentro de otro botón no es HTML válido. Con la
            capa debajo (el de borrar lleva su `position: relative`), ese sigue
            siendo suyo.

            El nombre va en la etiqueta: cien "Abrir" seguidos no dicen a quién
            se abre. */}
        {onClick && (
          <Box
            component="button"
            type="button"
            aria-label={name}
            onClick={() => onClick?.()}
            sx={{
              position: 'absolute',
              inset: 0,
              appearance: 'none',
              background: 'none',
              border: 'none',
              padding: 0,
              margin: 0,
              cursor: 'pointer',
              '&:focus-visible': {
                outline: '2px solid var(--accent-main)',
                outlineOffset: '-3px',
                borderRadius: 'var(--shape-md)',
              },
            }}
          />
        )}
        <StyledCardContent>
          <StyledBox gap="13px" sx={{ flexWrap: 'nowrap' }}>
            <StyledBox gap="12px" sx={{ width: '100%' }}>
              <StyledImgContainer>
                {female ? <UserCardFemaleImg /> : <UserCardMaleImg />}
              </StyledImgContainer>
              <StyledBoxSpaceBetween flexDirection="column">
                <StyledBoxSpaceBetween flexDirection="row" sx={{ gap: '12px' }}>
                  <StyledBoxSpaceBetween
                    flexDirection="column"
                    sx={{
                      justifyContent: 'center',
                    }}
                  >
                    <Typography
                      className="h4"
                      sx={{
                        whiteSpace: 'wrap',
                        marginBottom: '4px',
                      }}
                    >
                      {name}
                    </Typography>
                  </StyledBoxSpaceBetween>
                  {type === 'person' && onDelete && (
                    <StyledBox
                      sx={{ flexGrow: '1', flexDirection: 'row-reverse' }}
                    >
                      <StyledBox gap="16px">
                        <StyledIconWrapper
                          // Con el nombre dentro: en la lista de personas hay
                          // uno de estos por fila, y "Eliminar" cien veces
                          // seguidas no distingue a quién se borra.
                          aria-label={`Eliminar a ${name}`}
                          hoverBackgrColor="var(--red-secondary)"
                          iconColor="var(--red-main)"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete?.(e);
                          }}
                        >
                          <IconDelete />
                        </StyledIconWrapper>
                      </StyledBox>
                    </StyledBox>
                  )}
                </StyledBoxSpaceBetween>
                <StyledBox gap="8px" sx={{ flexWrap: 'wrap' }}>
                  {children}
                </StyledBox>
              </StyledBoxSpaceBetween>
              {(type !== 'person' || showArrow) && (
                <StyledBox
                  gap="8px"
                  sx={{
                    flexGrow: '1',
                    flexDirection: 'row-reverse',
                    alignItems: 'center',
                  }}
                >
                  <StyledIconWrapper
                    hoverBackgrColor="none"
                    iconColor="var(--black)"
                  >
                    <IconArrowLink />
                  </StyledIconWrapper>
                </StyledBox>
              )}
            </StyledBox>
          </StyledBox>

          {type === 'person' && chipLabels.length > 0 && (
            <StyledBox gap="13px">
              <StyledBox
                gap="8px"
                sx={{ alignItems: 'center', flexWrap: 'wrap' }}
              >
                {chipLabels.map((chipLabel, index) => (
                  <MiniChip key={index.toString()} label={chipLabel} />
                ))}
              </StyledBox>
            </StyledBox>
          )}
        </StyledCardContent>
      </StyledCard>
    </StyledCardBox>
  );
};

export default UserCard;
