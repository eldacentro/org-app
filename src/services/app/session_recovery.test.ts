import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Estas pruebas cubren UNA decisión: cuándo se manda a alguien a volver a
 * entrar. Equivocarse hacia «terminal» es exactamente lo que dejó fuera a media
 * congregación el 2026-08-05, así que cada camino que NO debe echar a nadie
 * tiene aquí su prueba.
 */

const apiSendAuthorization = vi.fn();
const currentAuthUser = vi.fn();
const getIdToken = vi.fn();

vi.mock('@services/api/user', () => ({
  apiSendAuthorization: (...args: unknown[]) => apiSendAuthorization(...args),
}));

vi.mock('@services/firebase/auth', () => ({
  currentAuthUser: () => currentAuthUser(),
}));

vi.mock('@services/logger', () => ({
  default: { info: vi.fn(), error: vi.fn() },
}));

const { recoverVipSession } = await import('./session_recovery');

const conRed = (online: boolean) =>
  vi.stubGlobal('navigator', { onLine: online });

beforeEach(() => {
  vi.clearAllMocks();
  conRed(true);
  getIdToken.mockResolvedValue('token-nuevo');
  currentAuthUser.mockReturnValue({ getIdToken });
  apiSendAuthorization.mockResolvedValue({
    status: 200,
    data: { message: 'TOKEN_VALID' },
  });
});

describe('recoverVipSession — lo que SÍ se recupera solo', () => {
  it('LOGIN_FIRST se repone en silencio', async () => {
    // El caso del desastre: el servidor no pudo comprobar el token. Antes esto
    // cerraba la sesión de todo el mundo a la vez.
    expect(await recoverVipSession('LOGIN_FIRST', { force: true })).toBe(
      'recovered'
    );
  });

  it('DEVICE_REVOKED también: es la cookie, no la cuenta', async () => {
    // Safari purga esa cookie por su cuenta cada pocos días. La sesión de
    // Firebase está intacta, así que pedir sesión otra vez la repone.
    expect(await recoverVipSession('DEVICE_REVOKED', { force: true })).toBe(
      'recovered'
    );
  });

  it('pide un token nuevo antes de intentarlo', async () => {
    await recoverVipSession('LOGIN_FIRST', { force: true });

    expect(getIdToken).toHaveBeenCalledWith(true);
  });
});

describe('recoverVipSession — lo que NO concluye nada', () => {
  it('sin red no se echa a nadie', async () => {
    conRed(false);

    expect(await recoverVipSession('LOGIN_FIRST', { force: true })).toBe(
      'retry'
    );
    expect(apiSendAuthorization).not.toHaveBeenCalled();
  });

  it('un 503 del servidor recién arrancado no es prueba de nada', async () => {
    apiSendAuthorization.mockResolvedValue({
      status: 503,
      data: { message: 'TOKEN_CHECK_UNAVAILABLE' },
    });

    expect(await recoverVipSession('LOGIN_FIRST', { force: true })).toBe(
      'retry'
    );
  });

  it('un 500 tampoco', async () => {
    apiSendAuthorization.mockResolvedValue({ status: 500, data: {} });

    expect(await recoverVipSession('LOGIN_FIRST', { force: true })).toBe(
      'retry'
    );
  });

  it('si la petición revienta, se reintenta', async () => {
    apiSendAuthorization.mockRejectedValue(new Error('Load failed'));

    expect(await recoverVipSession('LOGIN_FIRST', { force: true })).toBe(
      'retry'
    );
  });

  it('si no se puede refrescar el token, se reintenta', async () => {
    getIdToken.mockRejectedValue(new Error('network error'));

    expect(await recoverVipSession('LOGIN_FIRST', { force: true })).toBe(
      'retry'
    );
    expect(apiSendAuthorization).not.toHaveBeenCalled();
  });
});

describe('recoverVipSession — lo que sí exige volver a entrar', () => {
  it('SESSION_REVOKED: alguien revocó este dispositivo a propósito', async () => {
    expect(await recoverVipSession('SESSION_REVOKED', { force: true })).toBe(
      'terminal'
    );
    expect(apiSendAuthorization).not.toHaveBeenCalled();
  });

  it('ACCOUNT_NOT_FOUND: la cuenta ya no existe', async () => {
    expect(await recoverVipSession('ACCOUNT_NOT_FOUND', { force: true })).toBe(
      'terminal'
    );
  });

  it('sin sesión de Firebase no hay con qué reponer nada', async () => {
    currentAuthUser.mockReturnValue(undefined);

    expect(await recoverVipSession('LOGIN_FIRST', { force: true })).toBe(
      'terminal'
    );
  });

  it('con doble factor hace falta la persona', async () => {
    apiSendAuthorization.mockResolvedValue({
      status: 200,
      data: { message: 'MFA_VERIFY' },
    });

    expect(await recoverVipSession('LOGIN_FIRST', { force: true })).toBe(
      'terminal'
    );
  });

  it('si al pedir sesión el servidor dice que ya no existe la cuenta', async () => {
    apiSendAuthorization.mockResolvedValue({
      status: 403,
      data: { message: 'ACCOUNT_NOT_FOUND' },
    });

    expect(await recoverVipSession('LOGIN_FIRST', { force: true })).toBe(
      'terminal'
    );
  });
});

describe('recoverVipSession — el freno', () => {
  // El freno vive en el módulo, no en cada llamada — como en la app real, donde
  // hay uno solo para toda la sesión. Así que estas pruebas arrancan con el
  // reloj muy por delante de lo que hayan hecho las de arriba.
  let horasAdelante = 0;

  beforeEach(() => {
    // Y cada prueba avanza otra hora, para no heredar el freno de la anterior.
    horasAdelante += 1;
    const reloj = Date.now() + horasAdelante * 60 * 60 * 1000;
    vi.spyOn(Date, 'now').mockImplementation(() => reloj);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('no se intenta dos veces seguidas sin que lo pidan', async () => {
    // Sin freno: recuperar → el servidor sigue dando 403 porque el problema es
    // suyo → recuperar otra vez... en bucle, y contra un servidor que ya va
    // justo de memoria.
    expect(await recoverVipSession('LOGIN_FIRST')).toBe('recovered');
    expect(await recoverVipSession('LOGIN_FIRST')).toBe('retry');

    expect(apiSendAuthorization).toHaveBeenCalledTimes(1);
  });

  it('pero el botón sí lo fuerza', async () => {
    await recoverVipSession('LOGIN_FIRST');
    await recoverVipSession('LOGIN_FIRST', { force: true });

    expect(apiSendAuthorization).toHaveBeenCalledTimes(2);
  });
});
