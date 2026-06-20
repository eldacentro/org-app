import { addDoc, collection } from 'firebase/firestore';
import { firestore } from './index';

/**
 * Envia una notificación por correo electrónico insertando un documento
 * en la colección 'mail' (configurada con la extensión de Firebase Trigger Email).
 * Si tienes otra colección configurada para Resend, cámbiala aquí.
 */
const wrapWithTemplate = (contentHtml: string) => {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Notificación</title>
      <style>
        body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #f8fafc; padding-bottom: 40px; }
        .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { padding: 32px 32px 0 32px; text-align: center; }
        .header img { width: 64px; height: 64px; border-radius: 16px; margin-bottom: 16px; }
        .content { padding: 0 32px 32px 32px; color: #334155; font-size: 16px; line-height: 1.6; }
        h1 { color: #0f172a; font-size: 20px; font-weight: 600; text-align: center; margin-top: 0; }
        .footer { padding: 24px; text-align: center; color: #94a3b8; font-size: 13px; border-top: 1px solid #f1f5f9; background-color: #f8fafc; }
        .btn { display: inline-block; background-color: #3b82f6; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin-top: 24px; text-align: center; }
      </style>
    </head>
    <body>
      <table class="wrapper">
        <tr>
          <td>
            <table class="main">
              <tr>
                <td class="header">
                  <img src="https://eldacentro.com/img/icon/icon-192x192.png" alt="Elda Centro Logo">
                </td>
              </tr>
              <tr>
                <td class="content">
                  ${contentHtml}
                </td>
              </tr>
              <tr>
                <td class="footer">
                  © ${new Date().getFullYear()} Elda Centro.<br>Este es un mensaje automático generado por la aplicación.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

export const sendEmailNotification = async (
  to: string | string[],
  subject: string,
  html: string
) => {
  try {
    if (!to || to.length === 0) return;
    
    await addDoc(collection(firestore, 'mail'), {
      to,
      message: {
        subject,
        html: wrapWithTemplate(html),
      },
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Error sending email notification:', error);
  }
};
