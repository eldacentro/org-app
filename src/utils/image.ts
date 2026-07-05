// Redimensiona/comprime una imagen en el cliente antes de subirla, para no
// mandar fotos de cámara de varios MB cuando el destino final se ve a un
// ancho de tarjeta razonable (p. ej. la portada de una asamblea, siempre a
// 720px de ancho máximo en la tarjeta de "Próximos eventos").
export const resizeImageToJpeg = (
  file: File,
  maxWidth: number,
  quality = 0.85
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const scale = Math.min(1, maxWidth / img.width);
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('No se pudo obtener el contexto de canvas.'));
        return;
      }

      context.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('No se pudo generar la imagen comprimida.'));
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo cargar la imagen seleccionada.'));
    };

    img.src = objectUrl;
  });
};
