import os

files_to_patch = [
    'src/features/territories/responsables/DialogZonas.tsx',
    'src/features/territories/responsables/DialogEtiquetas.tsx',
    'src/features/territories/dialogs/DialogEditarTerritorio.tsx',
    'src/features/territories/DialogVerTerritorio.tsx'
]

for file_path in files_to_patch:
    with open(file_path, 'r') as f:
        content = f.read()

    if 'import { displaySnackNotification } from' not in content:
        # Add import at the top
        content = content.replace("import { useState", "import { displaySnackNotification } from '@services/app';\nimport { useState", 1)
        if "import { displaySnackNotification } from '@services/app';\n" not in content:
            # Maybe it doesn't have "import { useState"
            content = "import { displaySnackNotification } from '@services/app';\n" + content

    if file_path.endswith('DialogZonas.tsx'):
        content = content.replace("""    if (count > 0) {
      window.alert(
        `No puedes borrar "${zone.nombre}": tiene ${count} territorio(s). ` +
          'Muévelos o elimínalos primero.'
      );
      return;
    }""", """    if (count > 0) {
      displaySnackNotification({
        header: 'Error',
        message: `No puedes borrar "${zone.nombre}": tiene ${count} territorio(s). Muévelos o elimínalos primero.`,
        severity: 'error',
      });
      return;
    }""")
    
    elif file_path.endswith('DialogEtiquetas.tsx'):
        content = content.replace("""    if (count > 0) {
      window.alert(
        `No puedes borrar la etiqueta "${tag.nombre}": está en uso en ${count} territorio(s). ` +
          'Quítala de esos territorios primero.'
      );
      return;
    }""", """    if (count > 0) {
      displaySnackNotification({
        header: 'Error',
        message: `No puedes borrar la etiqueta "${tag.nombre}": está en uso en ${count} territorio(s). Quítala de esos territorios primero.`,
        severity: 'error',
      });
      return;
    }""")
        
    elif file_path.endswith('DialogEditarTerritorio.tsx'):
        content = content.replace("alert('Error guardando territorio');", """displaySnackNotification({
        header: 'Error',
        message: 'Error guardando territorio',
        severity: 'error',
      });""")
        content = content.replace("alert('Error eliminando territorio');", """displaySnackNotification({
          header: 'Error',
          message: 'Error eliminando territorio',
          severity: 'error',
        });""")

    elif file_path.endswith('DialogVerTerritorio.tsx'):
        content = content.replace("alert('Error subiendo imagen. Verifica tu conexión.');", """displaySnackNotification({
        header: 'Error',
        message: 'Error subiendo imagen. Verifica tu conexión.',
        severity: 'error',
      });""")
        content = content.replace("alert('Error eliminando la imagen. Verifica tu conexión.');", """displaySnackNotification({
        header: 'Error',
        message: 'Error eliminando la imagen. Verifica tu conexión.',
        severity: 'error',
      });""")

    with open(file_path, 'w') as f:
        f.write(content)

