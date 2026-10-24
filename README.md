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

## 3. WiFi "Karaoke" que solo abre la app — versión barata (router de ~$400)
Cualquier router sencillo que deje **cambiar el DNS del DHCP** (ej. TP-Link TL-WR840N / WR841N / WR820N). No necesitas adaptador Ethernet: la PC también se conecta a este WiFi.

```
Totalplay ─cable─▶ [WAN] Router barato ◀─WiFi "Karaoke" (abierta)─ celulares + PC del DJ
                         DHCP: DNS = IP de la PC
                         PC: contesta el DNS → toda página lleva al karaoke
```
Cómo funciona: el router les dice a los celulares "pregúntale los nombres a la PC". La PC contesta que **todo** está en ella, así que abran lo que abran les sale el karaoke, y el cel muestra solo "Iniciar sesión en la red". La PC sí resuelve nombres reales para que YouTube funcione en la pantalla.

Pasos:
1. **Puerto WAN** (el azul) del router → puerto LAN del módem Totalplay. Tipo de conexión: *IP dinámica*.
2. Entra al router (`192.168.0.1` en TP-Link) → **Inalámbrico**: nombre `Karaoke`, **seguridad deshabilitada** (sin contraseña).
3. Conecta la PC a `Karaoke` y ponla como red **Privada**.
4. **DHCP → Reserva de direcciones**: agrega la MAC de la PC con una IP fija, ej. `192.168.0.100`. (La MAC sale en la lista de "Clientes DHCP").
5. **DHCP → Configuración**: *DNS primario* = `192.168.0.100` y *DNS secundario* = `192.168.0.100` (igual, para que no se lo salten). Guarda.
6. Si el router tiene **IPv6**, apágalo.
7. En el `.env`: `CAPTIVE=1` y `PUBLIC_HOST=192.168.0.100`. Corre otra vez `ABRIR-FIREWALL.bat` (ahora abre también los puertos 80 y 53).
8. `INICIAR.bat`. En la consola deben salir dos líneas 🪤 del portal cautivo.
9. Prueba con tu cel: conéctate a `Karaoke`; debe salir "Iniciar sesión en la red" y abrir la app con el código ya puesto. Abre google.com: también te debe mandar al karaoke.

Límites (para una fiesta sobra):
- Quien sepa mucho puede saltárselo poniendo un DNS manual en su cel.
- Este router no aísla a los invitados de la red `192.168.100.x` de la casa; no tienen cómo encontrar tus equipos por nombre, pero no es un muro. Para aislamiento real, ver la sección 4.
- **Prende el servidor antes** de usar la PC en esa red: si está apagado, la PC tampoco resuelve nombres.

## 4. Versión pro con MikroTik (más adelante)
Un MikroTik hAP hace lo mismo con *hotspot + walled garden*, aísla de verdad la red de la casa y funciona con la app en Render. Archivos en `red-karaoke/`:
1. Puerto **1** del MikroTik → LAN del módem Totalplay.
2. **WinBox → Quick Set**: WiFi `Karaoke` sin contraseña y contraseña para el admin del router.
3. *IP → Hotspot → Hotspot Setup*: interfaz `bridge`; *DNS Name* `karaoke.fiesta`.
4. En `mikrotik-karaoke.rsc` y `login.html` cambia `karaoke-party.onrender.com` por tu dominio.
5. *Files → hotspot*: reemplaza `login.html` por el tuyo.
6. *New Terminal*: pega `mikrotik-karaoke.rsc`.

---

## Configuración (`.env` local o *Environment* en Render)
| Variable | Qué hace |
|---|---|
| `YOUTUBE_API_KEY` | Búsqueda por nombre. Sin ella solo se pueden pegar links |
| `ADMIN_PIN` | PIN de la pantalla. 5 intentos fallidos = bloqueo 10 min |
| `ROOM_CODE` | Código fijo de 4 letras. Vacío = nuevo en cada arranque |
| `PUBLIC_URL` | URL pública (Render). Activa el modo internet |
| `PUBLIC_HOST` | IP fija para el QR en modo local |
| `MAX_PER_PERSON` | Canciones por persona (incluye la que suena). `1` = una a la vez; al terminar puede agregar otra |
| `SEARCH_SUFFIX` | Se agrega a cada búsqueda (`karaoke`, `letra`…) |
| `SEARCH_DAILY_LIMIT` | Tope de búsquedas al día (la cuota gratis da ~100) |
| `WIFI_SSID` / `WIFI_PASS` | Muestra un QR para unirse al WiFi |
| `CAPTIVE` | `1` = portal cautivo en modo local (sección 3) |

Cuidar la cuota de YouTube: las búsquedas repetidas salen de caché, cada cel tiene límite (1 cada 2.5 s, 15 cada 10 min) y pegar un link no gasta cuota.

## En la fiesta
- **QR:** si configuraste el WiFi, arriba del QR hay dos botones (**📶 WiFi** / **🎤 Karaoke**) para elegir cuál se ve. Clic en el QR (o tecla **G**) lo pone en grande; tecla **Q** cambia entre los dos.
- **➕ Agregar canción para alguien:** para quien no pudo entrar al QR. Escribes su nombre, buscas la canción (o pegas un link) y le das *Agregar*; puedes ponerla como siguiente. Al DJ no le aplican el límite de una canción, la ronda de género ni el filtro de links.
- **Pantalla:** ⏯️ pausa, ⏭️ saltar, 📋 cola (reordenar, borrar, vaciar, 🔄 nuevo código de sala). Teclado: **→** saltar, **espacio** pausar.
- **YouTube Premium:** inicia sesión en youtube.com en el navegador de la pantalla y se van los anuncios.
- **Código filtrado:** 📋 → 🔄 Nuevo código. Los que ya estaban ven la cola, pero para anotarse piden el código nuevo.

## 📱 Instrucciones para los invitados
En el cel hay un botón **❓** (arriba a la derecha) con una guía corta: buscar y anotarse, una canción a la vez, géneros y rondas, reacciones y cómo votar en el concurso. Se abre sola la primera vez que alguien pone su nombre. El texto está en `public/index.html` (bloque `id="help"`).

## 🎤 Solo karaoke
Solo se aceptan videos de karaoke: el título debe decir *karaoke*, *pista*, *instrumental con letra*… o venir de un canal de karaoke (Sing King, KaraFun, Stingray, etc.). Se descartan videos oficiales, lyric videos, en vivo, covers, reacciones y tutoriales. También aplica a los links pegados y la cola rechaza cualquier video que no haya pasado el filtro. Para desactivarlo: `KARAOKE_ONLY=0`.

## 🎵 Géneros (validados de verdad)
Con un género activo la búsqueda es en 2 pasos: **1)** sale la lista de canciones que sí son de ese género, **2)** eliges una y salen sus karaokes.

- **En el cel:** la fila de géneros arriba del buscador es un filtro voluntario.
- **Ronda del DJ** (selector **🎵 Ronda**): obligatoria para todos; solo se anotan videos que salieron de una canción validada y no se aceptan links.

Cómo se decide si una canción es de un género (en este orden):
1. **El artista está en la lista de ese género** (`generos.js`) → sí.
2. **El artista está en la lista de OTRO género del mismo grupo** → no. Así Karol G o Bad Bunny nunca salen en *Pop en español* aunque Apple marque la canción como pop, y Sebastián Yatra no sale en *Reggaetón* aunque la canción sea urbana.
3. **Artista que no está en ninguna lista** → se usa el género que da Apple Music (ej. "Urbano latino" → reggaetón), **excepto en Pop en español, Baladas y Pop en inglés**: ahí solo cuentan las listas, porque Apple pone "Pop en español" a reggaetón y a baladas clásicas (pasó con *Gata Only*). En subgéneros (banda, salsa…) solo entra si su nombre lleva la palabra (ej. "Banda …") y Apple lo marca como mexicana/tropical.

**Capa Last.fm (gratis, recomendada):** para artistas que no están en ninguna lista, el servidor consulta sus etiquetas en Last.fm (ej. FloyyMenor → *reggaeton, reggaeton chileno*; Junior H → *corridos tumbados, sierreño*). Se suman los pesos de todas las etiquetas de cada género y gana el dominante; "pop" cuenta como genérico (si el artista tiene un género más específico con peso, no entra a pop). Si Last.fm tarda más de 2.5 s o falla, se sigue sin él. Resultados guardados 7 días.

Para activarla:
1. Crea una cuenta en last.fm y entra a https://www.last.fm/api/account/create
2. Llena *Application name* (`Karaoke`) y *Description*; lo demás vacío. Copia el **API key**.
3. En Render → Environment: `LASTFM_API_KEY=tu_clave`.

Detalles:
- Nombres de una palabra (Kiss, Queen, Mora, Camila…) cuentan solo exactos: *Mora* no atrapa a *Lalo Mora* ni *Queen* a *Queen Latifah*. Las colaboraciones (A & B, A feat. B) se revisan por cada artista.
- Lo que vimos en Apple: todo el reggaetón sale como "Urbano latino", pero Shakira sale como "Pop" (inglés). Por eso mandan las listas.
- Catálogo: Apple Music (trae género y año). Apple limita a ~20 consultas por minuto; si se satura se usa **Deezer** de respaldo (sin género: solo cuentan las listas de artistas; *Ochenteras* necesita a Apple por el año).
- Géneros: Salsa · Cumbia · Bachata · Merengue · Toda la tropical · Banda · Norteño · Mariachi · Corridos · Grupera · Toda la mexicana · Reggaetón · Pop en español · Rock en español · Baladas y boleros · Pop en inglés · Rock en inglés · Ochenteras · Infantiles.
- **¿Falta un artista?** Agrégalo en su lista de `generos.js` (acentos y mayúsculas no importan) y haz `git push`. Si de verdad hace dos estilos, ponlo en las dos.

## 🚫 Anti-rarezas
- En la lista de canciones se ocultan remixes, en vivo, *sped up/slowed*, mixes, covers, tributos y versiones karaoke de catálogo.
- Al elegir una canción, solo salen karaokes **de esa canción** (el título del video debe traer la mayoría de sus palabras).
- **🚩 Reportar:** los invitados pueden reportar una canción de la fila (no es del género o no es karaoke). Con `REPORTS_TO_REMOVE` (2) reportes de cels distintos se quita sola y la pantalla avisa. Nadie puede reportar la suya.

## 🎭 Concurso de disfraces
1. **🎭 Concurso de disfraces** → número de participantes (1–50) y nombres opcionales → **Iniciar concurso** (el karaoke se pausa).
2. **🗳️ Abrir votación**: un voto por cel, se puede cambiar mientras siga abierta. En la tele solo se ve cuántos votos van.
3. **🏁 Cerrar votación**: aparece el podio vacío.
4. Un clic por lugar: **🥉 Revelar 3er lugar → 🥈 2do → 🥇 1er**. Solo se muestran esos tres (empates comparten lugar; quien no tuvo votos no entra). Al revelar el 1º salen la corona y el confeti, y los celulares van viendo lo mismo.
5. **✕ Terminar concurso**: el karaoke sigue donde iba.

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
| `captive.js` | Portal cautivo: DNS falso + redirección en el puerto 80 |
| `generos.js` | Lista de géneros y artistas de cada subgénero |
| `lastfm.js` | Clasificación por etiquetas de Last.fm |
| `public/index.html` | App del invitado (código, nombre, búsqueda, turno, reacciones) |
| `public/screen.html` | Pantalla del DJ (reproductor, turnos, QR, emojis) |
| `render.yaml` | Configuración para Render |
| `red-karaoke/` | Script del MikroTik y página de redirección del hotspot |
| `*.bat` | Arranque y firewall en Windows |
