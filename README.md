# Asistente ALMA (ALMA Helper)

Userscript para **ALMA / TrakCare** (Servicio de Salud Coquimbo) que agrega atajos y mejoras
para el trabajo clínico diario. Funciona con **Tampermonkey** o **Violentmonkey**.

> El script **nunca guarda nada por ti**: toda indicación o nota se revisa y se guarda en
> ALMA como siempre. No envía datos a ningún servidor externo.

## Instalación

1. Instala [Tampermonkey](https://www.tampermonkey.net/) en tu navegador.
   - En Chrome: `chrome://extensions` → Tampermonkey → *Detalles* → activa
     **"Permitir scripts de usuario"** (o el *Modo de desarrollador* en Chrome < 138).
2. En Tampermonkey: *Crear un nuevo script*, pega el contenido de
   [`alma-helper.user.js`](alma-helper.user.js) y guarda.
3. Recarga ALMA. En el borde derecho aparece la pestaña **⚡ Asistente ALMA**.

Para actualizar, reemplaza el contenido del script por la nueva versión. El panel muestra
la versión instalada.

## Funciones

| Función | Atajo | Qué hace |
|---|---|---|
| 🩺 Evolucionar | Alt+E | Crea/abre tu evolución de hoy y copia la evolución más reciente de otro médico. Si ya guardaste la tuya, ofrece editarla o agregar una nota. |
| 🔒 Cerrar evolución | Alt+B | Bloquea (candado) tus evoluciones de hoy, con confirmación. |
| 📝 Notas médicas | Alt+N | Registro Clínico → Búsqueda filtrada por médicos. |
| 🩹 / 🏃 / 🧑‍⚕️ Notas por profesión | Alt+1 / 2 / 3 | Enfermería, kinesiología y TENS (perfil no médico). |
| ✍️ Indicaciones | Alt+I | Abre Indicaciones. Barra con Reposo, Régimen, Fármacos, Lab diario, Coronario, Otros exámenes y ⏰ 6 AM (solo perfil médico). Oculta ítems poco usados en la búsqueda. |
| 💊 Medicamentos | Alt+M | Resalta indicaciones vigentes, terminadas y suspendidas. |
| 👁️ Ocultar terminados | Alt+T | Solo en Medicamentos. |
| Panel | Alt+A | Muestra/oculta el panel. Incluye interruptor para apagar el script y ❓ Ayuda. |

El perfil (médico u otro profesional) se detecta del *Grupo de Seguridad* del usuario.

## Configuración

Al inicio de `alma-helper.user.js` está el objeto `CONFIG`: sets de exámenes, fármacos,
régimen, filtros de la búsqueda de indicaciones, atajos de teclado, etc.
