# 🎤 Karaoke Party

Los invitados escanean un QR, ponen su nombre, buscan su canción y se anotan. La pantalla del DJ reproduce la cola sola, muestra quién canta y los próximos 3, y recibe reacciones desde los celulares.

Se puede correr de dos formas:

| | **Local** (tu PC) | **Internet** (Render) |
|---|---|---|
| Dónde corre | PC con Windows | Servidor gratis en la nube |
| Invitados entran con | Tu WiFi | Datos móviles o el WiFi "Karaoke" |
| Necesitas | PC prendida en la red | Cuenta de GitHub + Render |

En ambos casos hay **código de sala** de 4 letras (sale en la pantalla y va dentro del QR) y la pantalla del DJ pide **PIN**.

---

## 1. Local en Windows (pruebas)
1. Instala **Node.js LTS** desde https://nodejs.org
2. Doble clic en **`ABRIR-FIREWALL.bat`** (acepta el permiso de admin). Una sola vez.
3. Pon tu WiFi como red **Privada**: *Configuración → Red e Internet → Wi‑Fi → tu red → Tipo de perfil de red*.
4. Doble clic en **`INICIAR.bat`**. Crea el `.env`, instala todo y abre la pantalla del DJ.
5. Escribe el PIN (`ADMIN_PIN` del `.env`, por defecto `1234`) y dale **Iniciar fiesta**.
6. Escanea el QR con el cel. El código de sala ya va dentro del QR.

Para apagarlo cierra la ventana negra.

## 2. En internet con Render
1. **Sube el proyecto a GitHub** (repo privado está bien). El `.gitignore` ya evita subir `.env` y `node_modules`.
   ```bash
   git init && git add . && git commit -m "karaoke"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/karaoke-party.git
   git push -u origin main
   ```
2. Entra a https://render.com con tu cuenta de GitHub → **New → Blueprint** → elige el repo. Render lee `render.yaml`.
3. Te pide las variables:
   - `YOUTUBE_API_KEY`: tu clave.
   - `ADMIN_PIN`: **6 dígitos o más**, que no sea 1234.
   - `PUBLIC_URL`: déjala vacía la primera vez.
4. Cuando termine, copia la URL que te da (ej. `https://karaoke-party-xxxx.onrender.com`), ponla en `PUBLIC_URL` (*Environment*, sin `/` al final) y guarda. Se redespliega solo.
5. En la PC de la TV abre `TU_URL/screen`, pon el PIN y listo.

Notas del plan gratis:
- El servidor **se duerme** si nadie lo usa un rato y tarda ~1 minuto en despertar. Abre la pantalla unos minutos antes de la fiesta; mientras esté abierta lo mantiene despierto.
- Si se reinicia, **se pierde la cola** y cambia el código de sala (para fijarlo, pon `ROOM_CODE`).

## 3. WiFi "Karaoke" que solo abre la app (AP de abajo)
Para los invitados sin datos: una red abierta donde **lo único que abre es el karaoke**. Al conectarse les salta el aviso "Iniciar sesión en la red" y los manda directo a la app.

```
Totalplay ─cable─▶ MikroTik ◀─WiFi "Karaoke" (abierta)─ celulares
                    · Hotspot: todo bloqueado excepto tu-app.onrender.com
                    · Sin acceso a la red de la casa
```

**Por qué no basta con el SR1041E o una VLAN:** una VLAN separa redes pero no limita qué páginas se abren. Para "solo esta página" se necesita un *hotspot con walled garden*. Los MikroTik lo traen; el SR1041E de Totalplay no.

Equipo sugerido: un MikroTik de la línea **hAP** (doble banda si se puede). Te sirve después para segmentar toda la red de la casa.

Pasos (archivos en `red-karaoke/`):
1. Conecta el puerto **1** del MikroTik a un puerto LAN del módem Totalplay.
2. Entra con **WinBox** → *Quick Set*: WiFi `Karaoke` **sin contraseña**, y ponle contraseña al admin del router.
3. *IP → Hotspot → Hotspot Setup*: interfaz `bridge`, acepta lo que propone; en *DNS Name* pon `karaoke.fiesta`.
4. Edita `mikrotik-karaoke.rsc` y `login.html`: cambia `karaoke-party.onrender.com` por tu dominio.
5. *Files* → abre la carpeta `hotspot` → arrastra tu `login.html` (reemplaza el que está).
6. *New Terminal* → pega el contenido de `mikrotik-karaoke.rsc`.
7. Prueba con tu cel: conéctate a `Karaoke`, debe abrirse la app sola. Intenta abrir google.com: no debe cargar.

Detalles:
- En iPhone, si cierran la ventanita, que elijan **"Usar sin internet"** para no desconectarse.
- Las miniaturas pasan por tu servidor (`/thumb/…`), así que solo hay que permitir **un dominio**.
- La pantalla del DJ **no** va en esta red: la PC usa tu WiFi o cable normal.

---

## Configuración (`.env` local o *Environment* en Render)
| Variable | Qué hace |
|---|---|
| `YOUTUBE_API_KEY` | Búsqueda por nombre. Sin ella solo se pueden pegar links |
| `ADMIN_PIN` | PIN de la pantalla. 5 intentos fallidos = bloqueo 10 min |
| `ROOM_CODE` | Código fijo de 4 letras. Vacío = nuevo en cada arranque |
| `PUBLIC_URL` | URL pública (Render). Activa el modo internet |
| `PUBLIC_HOST` | IP fija para el QR en modo local |
| `MAX_PER_PERSON` | Canciones en cola por persona (0 = sin límite) |
| `SEARCH_SUFFIX` | Se agrega a cada búsqueda (`karaoke`, `letra`…) |
| `SEARCH_DAILY_LIMIT` | Tope de búsquedas al día (la cuota gratis da ~100) |
| `WIFI_SSID` / `WIFI_PASS` | Muestra un QR para unirse al WiFi |

Cuidar la cuota de YouTube: las búsquedas repetidas salen de caché, cada cel tiene límite (1 cada 2.5 s, 15 cada 10 min) y pegar un link no gasta cuota.

## En la fiesta
- **Pantalla:** ⏯️ pausa, ⏭️ saltar, 📋 cola (reordenar, borrar, vaciar, 🔄 nuevo código de sala). Teclado: **→** saltar, **espacio** pausar.
- **YouTube Premium:** inicia sesión en youtube.com en el navegador de la pantalla y se van los anuncios.
- **Código filtrado:** 📋 → 🔄 Nuevo código. Los que ya estaban ven la cola, pero para anotarse piden el código nuevo.

## Problemas comunes
- **El cel no abre la página (local)** → mismo WiFi, red *Privada* y `ABRIR-FIREWALL.bat`. Si el router tiene "aislamiento de clientes", desactívalo.
- **IP equivocada en el QR** (VPN, Hyper‑V, VirtualBox) → pon `PUBLIC_HOST` en `.env`.
- **"El código cambió"** → el servidor se reinició; el nuevo código está en la pantalla.
- **"Video no disponible"** → ese video no permite embeberse; la app lo salta sola.
- **No suena al arrancar** → falta el clic en *Iniciar fiesta*.

## Archivos
| Archivo | Qué hace |
|---|---|
| `server.js` | Express + Socket.IO: cola, sala, PIN, búsqueda, QR, miniaturas |
| `public/index.html` | App del invitado (código, nombre, búsqueda, turno, reacciones) |
| `public/screen.html` | Pantalla del DJ (reproductor, turnos, QR, emojis) |
| `render.yaml` | Configuración para Render |
| `red-karaoke/` | Script del MikroTik y página de redirección del hotspot |
| `*.bat` | Arranque y firewall en Windows |
