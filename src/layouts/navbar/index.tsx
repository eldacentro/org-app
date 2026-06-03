import { useState, useEffect, useRef } from 'react';
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
import { isTest } from '@constants/index';

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

  // --- iOS-Style Pro Fluid Scroll Logic ---
  const [translateY, setTranslateY] = useState(0);
  const lastScrollY = useRef(0);
  const currentTranslateY = useRef(0);
  const NAVBAR_HEIGHT = 62;

  useEffect(() => {
    if (tabletUp) {
      setTranslateY(0);
      return;
    }

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          const delta = scrollY - lastScrollY.current;

          // Prevent weird behavior at page ends (overscroll)
          if (scrollY < 0) {
            currentTranslateY.current = 0;
          } else {
            // Update translation based on delta
            // scroll down (delta > 0) -> move up (increase translate)
            // scroll up (delta < 0) -> move down (decrease translate)
            currentTranslateY.current = Math.max(
              0,
              Math.min(NAVBAR_HEIGHT, currentTranslateY.current + delta)
            );
          }

          setTranslateY(currentTranslateY.current);
          lastScrollY.current = scrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [tabletUp]);

  // Glassmorphic state trigger (active after 10px)
  const scrolled = useScrollTrigger({
    disableHysteresis: true,
    threshold: 10,
  });

  return (
    <>
      <AppBar
        position="fixed"
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
          minHeight: `${NAVBAR_HEIGHT}px`,
          top: 0,
          left: 0,
          width: '100%',
          overflow: 'hidden',
          zIndex: (theme) => theme.zIndex.drawer - 1,
          // Fluid Pro Animation
          transform: `translateY(${-translateY}px)`,
          transition: scrolled
            ? 'background-color 0.2s ease, backdrop-filter 0.2s ease, border-color 0.2s ease'
            : 'none',
        }}
      >
        <Toolbar
          sx={{
            padding: 0,
            minHeight: `${NAVBAR_HEIGHT}px`,
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
                <div
                  className="topbar"
                  style={{ display: 'flex', alignItems: 'center', width: '100%' }}
                >
                  <div
                    className="logo-container"
                    onClick={handleGoDashboard}
                    style={{
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <IconLogo width={40} height={40} color="var(--brand)" />
                  </div>
                  <div
                    style={{
                      flex: 1,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      marginLeft: '12px',
                    }}
                    onClick={handleGoDashboard}
                  >
                    <div
                      className="cong-name"
                      style={{
                        fontFamily: 'Figtree, sans-serif',
                        fontWeight: 900,
                        fontSize: '24px',
                        letterSpacing: '-0.5px',
                        color: 'var(--ink)',
                      }}
                    >
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

                    {tabletUp && (isAppLoad || isTest) && (
                      <Box
                        sx={{
                          background: 'var(--card)',
                          borderRadius: '12px',
                          border: '1px solid var(--line)',
                          padding: '2px 4px',
                          boxShadow: 'var(--shadow-sm)',
                        }}
                      >
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

                          {(tabletDown || (!isAppLoad && !isTest)) && (
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
                    !tablet688Up && <Box sx={{ width: '22px', height: '22px' }} />
                  )}
                </Box>
                {!!tablet688Up && navBarOptions.buttons && (
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
      {navBarOptions.buttons && !tablet688Up && (
        <BottomMenu buttons={navBarOptions.buttons} />
      )}
    </>
  );
};

export default NavBar;
