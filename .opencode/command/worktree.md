---
description: Crea un git worktree en .worktrees/<nombre> derivado del contexto recibido.
agent: build
---

Ejecuta ÚNICAMENTE este comando, sin cambiar de directorio ni realizar ninguna otra acción adicional:

```
git worktree add .worktrees/<nombre-del-worktree>
```

El usuario te pasó como argumento el propósito o contexto: $ARGUMENTS

Si $ARGUMENTS está vacío (el usuario solo escribió `/worktree`), usa la herramienta `question` para preguntarle el propósito o nombre del worktree antes de continuar.

Analiza el contexto recibido y deriva un nombre de worktree siguiendo estas reglas:
- Solo letras minúsculas, números y guiones (kebab-case).
- Sin espacios, sin acentos, sin signos de puntuación, sin caracteres especiales.
- Conciso pero descriptivo del contexto recibido.
- Refleja la tarea o propósito indicado en el argumento.

Sustituye `<nombre-del-worktree>` por el nombre derivado y ejecuta el comando con la herramienta bash. No hagas nada más: no cambies de directorio, no hagas commit, no edites archivos, no agregues mensajes adicionales. Termina inmediatamente después de ejecutar el comando.
