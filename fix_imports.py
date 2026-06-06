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

    content = content.replace("import { displaySnackNotification } from '@services/app';", "import { displaySnackNotification } from '@services/states/app';")

    with open(file_path, 'w') as f:
        f.write(content)

