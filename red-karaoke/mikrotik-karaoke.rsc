# =====================================================================
#  WiFi "Karaoke": los invitados SOLO pueden abrir la app del karaoke
#  Router: MikroTik (RouterOS 7) con su configuración de fábrica:
#    ether1 = cable al módem Totalplay (internet)
#    bridge = WiFi + demás puertos, red 192.168.88.0/24
#  ANTES de pegar esto:
#    1) Quick Set: pon el WiFi con nombre "Karaoke" y SIN contraseña,
#       y ponle contraseña al usuario admin del router.
#    2) IP > Hotspot > "Hotspot Setup": interfaz "bridge", acepta todo,
#       en "DNS Name" escribe  karaoke.fiesta  y en "local hotspot user"
#       deja admin con una contraseña larga (nadie la va a usar).
#    3) Cambia "karaoke-party.onrender.com" (aparece 2 veces) por tu dominio.
#  Luego: New Terminal en WinBox y pega todo el archivo.
# =====================================================================

# --- Lo único que se puede abrir sin "iniciar sesión" ---
/ip hotspot walled-garden
add dst-host=karaoke-party.onrender.com comment="karaoke"
/ip hotspot walled-garden ip
add action=accept dst-host=karaoke-party.onrender.com comment="karaoke (https y websockets)"

# --- Sin cerrar sesión por inactividad, para que no los saque a media canción ---
/ip hotspot set [find] idle-timeout=none

# --- Nunca dejar pasar a la red de la casa (módem y demás equipos) ---
/ip firewall filter
add chain=forward in-interface=bridge dst-address=192.168.100.0/24 action=drop \
    comment="karaoke: no ver la red de casa" place-before=0

# --- Servicios que no se usan, apagados ---
/ip service
set telnet disabled=yes
set ftp disabled=yes

:put "Listo. Falta subir login.html a la carpeta hotspot (Files) reemplazando el original."
