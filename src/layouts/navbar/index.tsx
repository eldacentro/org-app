import { useEffect, useRef } from 'react';
import {
  AppBar,
  Box,
  Container,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  useTheme,
  useScrollTrigger,
} from '@mui/material';
import {
  IconAccount,
  IconInfo,
  IconLogin,
  IconLogo,
  IconArrowLink,
  IconLogout,
  IconArrowBack,
  IconSettings,
  IconHome,
  IconSynced,
} from '@icons/index';
import { useAppTranslation, useFirebaseAuth } from '@hooks/index';

import { NavBarType } from './index.types';
import useNavbar from './useNavbar';
import AccountHeaderIcon from '@components/account_header_icon';
import AppNotification from '@features/app_notification';
import Button from '@components/button';
import LanguageSwitcher from '@features/language_switcher';
import ThemeSwitcher from '@features/theme_switcher';
import Typography from '@components/typography';
import IconButton from '@components/icon_button';
import BottomMenu from '@layouts/bottom_menu';
import { hasRenderableContent } from '@utils/common';
import { FORCED_UI_LANG, isTest } from '@constants/index';

const baseMenuStyle = {
  padding: '8px 12px 8px 16px',
  minHeight: '40px',
  height: '40px',
  gap: '8px',
};

const menuStyle = {
  ...baseMenuStyle,
  '&:hover': {
    backgroundColor: 'var(--accent-100)',
    '& p': {
      color: 'var(--accent-main)',
    },
    '& svg, & svg g, & svg g path': {
      fill: 'var(--accent-main)',
    },
  },
};

const NavBar = ({ isSupported }: NavBarType) => {
  const { t } = useAppTranslation();
  const theme = useTheme();

  const { isAuthenticated } = useFirebaseAuth();

  const {
    anchorEl,
    handleCloseMore,
    handleOpenMoreMenu,
    openMore,
    handleOpenAbout,
    tabletUp,
    tabletDown,
    isCongAccountConnected,
    handleOpenMyProfile,
    handleManualSync,
    isSyncing,
    syncSecondaryText,
    handleGoDashboard,
    isAppLoad,
    handleReconnectAccount,
    handleOpenRealApp,
    handleBack,
    accountType,
    tablet688Up,
    handleDisonnectAccount,
    congName,
    fullname,
    navBarOptions,
    handleQuickSettings,
  } = useNavbar();

  // --- iOS-Style hide/show por dirección (snap suave) ---
  // El JS SOLO decide si la barra se esconde o se muestra según la dirección
  // del scroll; el movimiento lo hace una transición CSS (no se mueve frame a
  // frame desde JS, así que no hay lag con los eventos a ráfagas de iOS).
  // Bajar -> se esconde; subir cualquier cantidad -> reaparece; arriba del todo
  // -> siempre visible. El wrapper se mueve con transform y el AppBar de dentro
  // lleva el cristal: capas separadas para evitar el artefacto de WebKit.
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;

    // Desktop/tablet: siempre visible, sin escuchar el scroll.
    if (tabletUp) {
      el.style.transform = 'translateY(0)';
      return;
    }

    const SHOW_AT_TOP = 10; // px: tan arriba que siempre se ve
    const HIDE_AFTER = 80; // px: no esconder hasta haber bajado algo
    const DEADZONE = 6; // px: ignora micro-temblores del dedo

    let lastY = window.scrollY;
    let hidden = false;
    let ticking = false;

    const setHidden = (next: boolean) => {
      if (next === hidden) return;
      hidden = next;
      el.style.transform = next ? 'translateY(-100%)' : 'translateY(0)';
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const dy = y - lastY;

        if (y <= SHOW_AT_TOP) {
          setHidden(false);
        } else if (Math.abs(dy) > DEADZONE) {
          if (dy > 0 && y > HIDE_AFTER) setHidden(true); // bajando -> esconder
          else if (dy < 0) setHidden(false); // subiendo -> mostrar
        }

        lastY = y;
        ticking = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [tabletUp]);

  // Glassmorphic state trigger (active after 10px)
  const scrolled = useScrollTrigger({
    disableHysteresis: true,
    threshold: 10,
  });

  return (
    <>
      <Box
        ref={navRef}
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          zIndex: (theme) => theme.zIndex.drawer - 1,
          willChange: 'transform',
          // El movimiento (snap) lo hace esta transición, no el JS.
          transition: 'transform 0.24s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <AppBar
          position="static"
          elevation={0}
          className={scrolled ? 'appbar-scrolled' : 'appbar-top'}
          sx={{
            backgroundColor: scrolled
              ? 'rgba(var(--accent-100-base), 0.65) !important'
              : 'transparent !important',
            backgroundImage: 'none !important',
            boxShadow: 'none !important',
            backdropFilter: scrolled ? 'blur(24px) !important' : 'none !important',
            WebkitBackdropFilter: scrolled
              ? 'blur(24px) !important'
              : 'none !important',
            borderBottom: scrolled
              ? '1px solid var(--line) !important'
              : '1px solid transparent !important',
            transition:
              'background-color 0.2s ease, backdrop-filter 0.2s ease, border-color 0.2s ease',
            minHeight: '62px',
            width: '100%',
            overflow: 'hidden',
          }}
        >
          <Toolbar
            sx={{
              padding: 0,
              minHeight: '62px',
              alignItems: 'center',
              backgroundColor: 'transparent !important',
              backgroundImage: 'none !important',
            }}
          >
          <Container
            maxWidth={false}
            sx={{
              maxWidth: '1440px',
              padding:
                navBarOptions.title !== null
                  ? { mobile: '4px 16px', tablet: '6px 32px' }
                  : { mobile: '8px 16px', tablet: '6px 32px' },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {!navBarOptions.title && !navBarOptions.buttons ? (
              <>
                <div className="topbar" style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <div className="logo-container" onClick={handleGoDashboard} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <IconLogo width={40} height={40} color="var(--brand)" />
                  </div>
                  <div style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', marginLeft: '12px' }} onClick={handleGoDashboard}>
                    <div className="cong-name" style={{ fontFamily: 'Figtree, sans-serif', fontWeight: 900, fontSize: '24px', letterSpacing: '-0.5px', color: 'var(--ink)' }}>
                      {congName ? congName.replace(/-/g, ' ') : 'Elda Centro'}
                    </div>
                  </div>
                  
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: { mobile: '4px', tablet: '8px' },
                    }}
                  >
                    {isSupported && <AppNotification />}

                    <ThemeSwitcher />

                    {!FORCED_UI_LANG && tabletUp && (isAppLoad || isTest) && (
                      <Box sx={{ background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--line)', padding: '2px 4px', boxShadow: 'var(--shadow-sm)' }}>
                        <LanguageSwitcher
                          menuStyle={{
                            ...baseMenuStyle,
                            '&:hover': {
                              backgroundColor: 'var(--accent-200)',
                              borderRadius: 'var(--radius-l)',
                            },
                            '&:focus-visible': {
                              outline: 'var(--accent-main) auto 1px',
                            },
                          }}
                        />
                      </Box>
                    )}

                    {isSupported && (
                      <>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginLeft: !tabletUp ? '4px' : '0px',
                          }}
                        >
                          <AccountHeaderIcon
                            handleOpenMore={handleOpenMoreMenu}
                            isMoreOpen={openMore}
                          />
                        </Box>

                      <Menu
                        disableAutoFocus={true}
                        id="menu-language"
                        disableScrollLock={true}
                        anchorEl={anchorEl}
                        open={openMore}
                        onClose={handleCloseMore}
                        sx={{
                          padding: '8px 0',
                          marginTop: '7px',
                          '& li': {
                            borderBottom: '1px solid var(--accent-200)',
                          },
                          '& li:last-child': {
                            borderBottom: 'none',
                          },
                        }}
                        slotProps={{
                          list: {
                            'aria-labelledby': 'basic-button',
                          },
                          paper: {
                            className: 'small-card-shadow profile-menu-glass',
                            style: {
                              borderRadius: 'var(--radius-l)',
                              minWidth: '294px',
                            },
                          },
                        }}
                      >
                        <MenuItem
                          disableRipple
                          sx={{
                            cursor: 'default',
                            pointerEvents: 'none',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            gap: 0,
                          }}
                        >
                          {fullname && (
                            <Typography className="body-small-semibold">
                              {fullname}
                            </Typography>
                          )}
                          {congName && (
                            <Typography
                              className="label-small-regular"
                              color="var(--grey-350)"
                            >
                              {congName}
                            </Typography>
                          )}
                        </MenuItem>

                        {!FORCED_UI_LANG &&
                          (tabletDown || (!isAppLoad && !isTest)) && (
                            <LanguageSwitcher menuStyle={menuStyle} />
                          )}

                        {!isAppLoad && (
                          <MenuItem
                            disableRipple
                            sx={menuStyle}
                            onClick={handleOpenMyProfile}
                          >
                            <ListItemIcon
                              sx={{
                                '&.MuiListItemIcon-root': {
                                  width: '24px',
                                  minWidth: '24px !important',
                                },
                              }}
                            >
                              <IconAccount color="var(--black)" />
                            </ListItemIcon>
                            <ListItemText>
                              <Typography className="body-regular">
                                {t('tr_myProfile')}
                              </Typography>
                            </ListItemText>
                          </MenuItem>
                        )}

                        {isCongAccountConnected && (
                          <MenuItem
                            disableRipple
                            sx={menuStyle}
                            onClick={handleManualSync}
                          >
                            <ListItemIcon
                              sx={{
                                '&.MuiListItemIcon-root': {
                                  width: '24px',
                                  minWidth: '24px !important',
                                },
                              }}
                            >
                              <IconSynced
                                color="var(--black)"
                                sx={{
                                  animation: isSyncing
                                    ? 'rotate 2s linear infinite'
                                    : 'none',
                                }}
                              />
                            </ListItemIcon>
                            <ListItemText>
                              <Typography className="body-regular">
                                {t('tr_syncAppData')}
                              </Typography>
                              {syncSecondaryText && (
                                <Typography
                                  className="label-small-regular"
                                  color="var(--grey-350)"
                                >
                                  {syncSecondaryText}
                                </Typography>
                              )}
                            </ListItemText>
                          </MenuItem>
                        )}

                        <MenuItem
                          disableRipple
                          sx={menuStyle}
                          onClick={handleOpenAbout}
                        >
                          <ListItemIcon
                            sx={{
                              '&.MuiListItemIcon-root': {
                                width: '24px',
                                minWidth: '24px !important',
                              },
                            }}
                          >
                            <IconInfo color="var(--black)" />
                          </ListItemIcon>
                          <ListItemText>
                            <Typography className="body-regular">
                              {t('tr_about')}
                            </Typography>
                          </ListItemText>
                        </MenuItem>

                        {isTest && (
                          <MenuItem
                            disableRipple
                            sx={{
                              ...menuStyle,
                              height: 'auto',
                              paddingTop: '5px',
                            }}
                            onClick={handleOpenRealApp}
                          >
                            <Button
                              variant="tertiary"
                              startIcon={<IconArrowLink />}
                              sx={{ width: '100%' }}
                            >
                              {t('tr_openRealApp')}
                            </Button>
                          </MenuItem>
                        )}

                        {!isTest &&
                          !isAppLoad &&
                          !isCongAccountConnected &&
                          accountType === 'vip' && (
                            <MenuItem
                              disableRipple
                              sx={menuStyle}
                              onClick={handleReconnectAccount}
                            >
                              <ListItemIcon
                                sx={{
                                  '&.MuiListItemIcon-root': {
                                    width: '24px',
                                    minWidth: '24px !important',
                                  },
                                }}
                              >
                                <IconLogin color="var(--black)" />
                              </ListItemIcon>
                              <ListItemText>
                                <Typography className="body-regular">
                                  {t('tr_reconnectAccount')}
                                </Typography>
                              </ListItemText>
                            </MenuItem>
                          )}

                        {isAuthenticated && (
                          <MenuItem
                            disableRipple
                            sx={menuStyle}
                            onClick={handleDisonnectAccount}
                          >
                            <ListItemIcon
                              sx={{
                                '&.MuiListItemIcon-root': {
                                  width: '24px',
                                  minWidth: '24px !important',
                                },
                              }}
                            >
                              <IconLogout color="var(--black)" />
                            </ListItemIcon>
                            <ListItemText>
                              <Typography className="body-regular">
                                {t('tr_disconnectAccount')}
                              </Typography>
                            </ListItemText>
                          </MenuItem>
                        )}
                      </Menu>
                    </>
                  )}
                </Box>
              </div>
            </>
          ) : (
            <>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: { mobile: '8px', tablet: '16px' },
                    alignItems: 'center',
                    width: !tablet688Up ? '100%' : 'auto',
                    justifyContent: !tablet688Up ? 'space-between' : 'start',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton
                      aria-label={t('tr_back')}
                      onClick={handleBack}
                      sx={{
                        marginLeft: '-10px',
                        '&:hover': {
                          backgroundColor: 'var(--accent-200)',
                          '& svg': {
                            transform:
                              theme.direction === 'rtl'
                                ? 'translateX(4px) scaleX(-1)'
                                : 'translateX(-4px)',
                          },
                        },
                        '& svg': {
                          transition: 'transform 0.2s ease-in-out',
                        },
                      }}
                    >
                      <IconArrowBack color="var(--black)" />
                    </IconButton>
                    <IconButton
                      aria-label={t('tr_dashboard')}
                      onClick={handleGoDashboard}
                      sx={{
                        marginLeft: '-8px',
                        '&:hover': { backgroundColor: 'var(--accent-200)' },
                      }}
                    >
                      <IconHome color="var(--black)" />
                    </IconButton>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      marginLeft: '-8px',
                    }}
                  >
                    <Typography
                      className="h3"
                      color="var(--black)"
                      sx={{
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                      }}
                    >
                      {navBarOptions.title}
                    </Typography>
                    <Typography
                      className="label-small-regular"
                      color="var(--accent-400)"
                      sx={{
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                      }}
                    >
                      {navBarOptions.secondaryTitle}
                    </Typography>
                  </Box>
                  {navBarOptions.quickSettings ? (
                    <IconButton
                      onClick={handleQuickSettings}
                      aria-label={t('tr_quickSettings')}
                      sx={{
                        marginRight: '-8px',
                        transition: 'background-color 50ms ease-in-out',
                        '&:hover': {
                          backgroundColor: 'var(--accent-200)',
                        },
                      }}
                    >
                      <IconSettings color="var(--black)" />
                    </IconButton>
                  ) : (
                    !tablet688Up && (
                      <Box sx={{ width: '22px', height: '22px' }} />
                    )
                  )}
                </Box>
                {!!tablet688Up && hasRenderableContent(navBarOptions.buttons) && (
                  <Box
                    className="navbar-actions-container"
                    sx={{
                      display: 'flex',
                      gap: '6px',
                      padding: '4px',
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderRadius: 'var(--radius-xl)',
                    }}
                  >
                    {navBarOptions.buttons}
                  </Box>
                )}
              </>
            )}
          </Container>
        </Toolbar>
      </AppBar>
    </Box>
    {hasRenderableContent(navBarOptions.buttons) && !tablet688Up && (
      <BottomMenu buttons={navBarOptions.buttons} />
    )}
  </>
);
};

export default NavBar;
