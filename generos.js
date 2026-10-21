// =====================================================================
//  Géneros del karaoke
//  - Los géneros "familia" se validan con el género que da Apple Music (iTunes).
//  - Los subgéneros (banda, norteño, salsa, cumbia…) se validan por ARTISTA,
//    porque Apple los agrupa. Para agregar un artista, escríbelo en su lista
//    (sin importar mayúsculas ni acentos) y haz git push.
//  - keyword: si el nombre del artista contiene esa palabra (ej. "Banda MS")
//    y Apple lo marca dentro de la familia, también cuenta.
// =====================================================================

const TROPICAL = /salsa|tropical|cumbia|merengue|bachata/;
const MEXICANA = /mexican|ranchera|norten|banda|grupero|mariachi|corrido/;

export const GENRES = [
  // ---------- Tropical ----------
  {
    id: 'salsa', group: 'Tropical', label: 'Salsa', emoji: '💃', family: TROPICAL, keyword: /salsa/,
    artists: [
      'El Gran Combo', 'Marc Anthony', 'Celia Cruz', 'Hector Lavoe', 'Willie Colon', 'Ruben Blades', "Oscar D'Leon",
      'Gilberto Santa Rosa', 'Grupo Niche', 'Joe Arroyo', 'Frankie Ruiz', 'Eddie Santiago', 'Victor Manuelle',
      'Jerry Rivera', 'La India', 'Tito Nieves', 'Luis Enrique', 'Tony Vega', 'Ismael Rivera', 'Fania All Stars',
      'Sonora Poncena', 'Guayacan', 'Maelo Ruiz', 'Rey Ruiz', 'Willie Gonzalez', 'Lalo Rodriguez', 'Tito Rojas',
      'Johnny Rivera', 'Charlie Aponte', 'Sonora Carruseles', 'Ray Barretto', 'Tito Puente', 'Cheo Feliciano',
      'Ismael Miranda', 'Pete El Conde Rodriguez', 'Bobby Valentin', 'Andy Montanez', 'Sonora Matancera', 'DLG',
      'Michael Stuart', 'Yuri Buenaventura', 'Richie Ray', 'Bobby Cruz', 'Orquesta de la Luz', 'Grupo Galé',
      'Son de Cali', 'Adolescentes Orquesta', 'Hansel y Raul', 'N\'Klabe', 'Sergio George',
    ],
  },
  {
    id: 'cumbia', group: 'Tropical', label: 'Cumbia', emoji: '🪇', family: TROPICAL, keyword: /cumbia|kumbia|sonora/,
    artists: [
      'Los Angeles Azules', 'Sonora Dinamita', 'Sonora Santanera', 'Celso Pina', 'Rigo Tovar', 'Grupo Canaveral',
      'Los Askis', 'Los Socios del Ritmo', 'Aniceto Molina', 'Los Mirlos', 'Kumbia Kings', 'A.B. Quintanilla',
      'Kumbia All Starz', 'Selena', 'Margarita la Diosa de la Cumbia', 'Lisandro Meza', 'Los Palmeras', 'Americo',
      'Grupo 5', 'Agua Marina', 'Corazon Serrano', 'Grupo Nectar', 'Los Angeles de Charly', 'Chico Che',
      'Tropical Florida', 'Rayito Colombiano', 'Super Grupo Colombia', 'Fito Olivares', 'Grupo Super T',
      'Alberto Pedraza', 'Grupo Siggno', 'Los Hermanos Flores', 'La Sonora de Margarita', 'Los Karkik\'s',
      'Grupo Kual', 'Mike Bahia', 'Grupo Bryndis', 'Los Caminantes', 'La Luz Roja de San Marcos', 'Ke Personajes',
      'Damas Gratis', 'Los Totora', 'Rafaga', 'Gilda', 'Grupo Maravilla', 'Sonido Mazter',
    ],
  },
  {
    id: 'bachata', group: 'Tropical', label: 'Bachata', emoji: '🌹', family: TROPICAL, keyword: /bachata/,
    artists: [
      'Romeo Santos', 'Aventura', 'Prince Royce', 'Juan Luis Guerra', 'Antony Santos', 'Anthony Santos', 'Frank Reyes',
      'Raulin Rodriguez', 'Zacarias Ferreira', 'Hector Acosta', 'Luis Vargas', 'Joe Veras', 'Monchy & Alexandra',
      'Monchy y Alexandra', 'Xtreme', 'Toby Love', 'Grupo Extra', 'Leslie Grace', 'Elvis Martinez', 'Yoskar Sarante',
      'Teodoro Reyes', 'Kiko Rodriguez', 'Daniel Santacruz', 'Karlos Rose', 'Henry Santos', 'Lenny Santos',
      'Luis Miguel del Amargue', 'El Chaval de la Bachata', 'Grupo Mania',
    ],
  },
  {
    id: 'merengue', group: 'Tropical', label: 'Merengue', emoji: '🥁', family: TROPICAL, keyword: /merengue/,
    artists: [
      'Juan Luis Guerra', 'Elvis Crespo', 'Wilfrido Vargas', 'Los Hermanos Rosario', 'Johnny Ventura', 'Sergio Vargas',
      'Tono Rosario', 'Fernando Villalona', 'Olga Tanon', 'Eddy Herrera', 'Kinito Mendez', 'Proyecto Uno',
      'Milly Quezada', 'Los Toros Band', 'Rikarena', 'Las Chicas del Can', 'Bonny Cepeda', 'Los Vecinos',
      'Grupo Mania', 'Manny Manuel', 'Jossie Esteban', 'Ilegales', 'Fulanito', 'Miriam Cruz', 'Banda Gorda',
      'Coco Band', 'La Makina', 'Oro Solido', 'Sandy & Papo', 'Sandy y Papo', 'Limi-T 21', 'Jandy Feliz',
    ],
  },
  { id: 'tropical', group: 'Tropical', label: 'Toda la tropical', emoji: '🌴', hint: 'salsa, cumbia, bachata, merengue', match: TROPICAL },

  // ---------- Mexicana ----------
  {
    id: 'banda', group: 'Música mexicana', label: 'Banda', emoji: '🎺', family: MEXICANA, keyword: /(^|\s)banda(\s|$)/,
    artists: [
      'Banda MS', 'Banda El Recodo', 'El Recodo', 'La Arrolladora', 'Banda El Limon', 'Julion Alvarez',
      'Banda Los Recoditos', 'Los Recoditos', 'Banda Carnaval', 'La Adictiva', 'Banda Machos', 'Mi Banda El Mexicano',
      'Banda Maguey', 'El Coyote y su Banda', 'German Montero', 'La Trakalosa', 'Edwin Luna', 'Espinoza Paz',
      'Lupillo Rivera', 'Jenni Rivera', 'Joan Sebastian', 'El Chapo de Sinaloa', 'Banda Cuisillos',
      'Banda Pequenos Musical', 'Banda Los Sebastianes', 'Pancho Barraza', 'Larry Hernandez', 'Remmy Valenzuela',
      'Chuy Lizarraga', 'Banda La Costena', 'Banda Sinaloense', 'El Mimoso', 'Luis Antonio Lopez', 'Cuisillos',
      'Banda Rancho Viejo', 'Banda Clave Nueva', 'Banda Tierra Sagrada', 'Banda Los Lagos', 'Saul El Jaguar',
      'Ezequiel Pena', 'Valentin Elizalde',
    ],
  },
  {
    id: 'norteno', group: 'Música mexicana', label: 'Norteño', emoji: '🪗', family: MEXICANA, keyword: /norten|del norte|nuevo leon/,
    artists: [
      'Los Tigres del Norte', 'Ramon Ayala', 'Los Tucanes de Tijuana', 'Intocable', 'Pesado', 'Calibre 50',
      'Los Huracanes del Norte', 'Los Invasores de Nuevo Leon', 'Cardenales de Nuevo Leon', 'Duelo',
      'Los Rieleros del Norte', 'Grupo Frontera', 'Los Dos Carnales', 'Lalo Mora', 'Conjunto Primavera',
      'Los Alegres de Teran', 'Carin Leon', 'Grupo Firme', 'Polo Urias', 'Alfredo Olivas', 'El Fantasma',
      'Los Plebes del Rancho', 'Los Cadetes de Linares', 'Los Herederos de Nuevo Leon', 'La Energia Nortena',
      'Grupo Montez de Durango', 'Los Rayos de Oaxaca', 'Los Terribles del Norte', 'Polo Urias y su Maquina Nortena',
      'Eliseo Robles', 'Los Traileros del Norte', 'Los Originales de San Juan', 'Los Cachorros de Juan Villarreal',
      'Ramon Ayala y sus Bravos del Norte', 'Bobby Pulido', 'Siggno', 'El Poder del Norte', 'Los Alegres del Barranco',
      'Grupo Codiciado', 'Los Sebastianes', 'Leandro Rios',
    ],
  },
  {
    id: 'mariachi', group: 'Música mexicana', label: 'Mariachi / ranchera', emoji: '🤠', family: MEXICANA, keyword: /mariachi/,
    artists: [
      'Vicente Fernandez', 'Alejandro Fernandez', 'Pedro Infante', 'Jorge Negrete', 'Javier Solis', 'Jose Alfredo Jimenez',
      'Antonio Aguilar', 'Lola Beltran', 'Lucha Villa', 'Rocio Durcal', 'Juan Gabriel', 'Pepe Aguilar', 'Aida Cuevas',
      'Mariachi Vargas', 'Christian Nodal', 'Angela Aguilar', 'Flor Silvestre', 'Miguel Aceves Mejia', 'Cuco Sanchez',
      'Chavela Vargas', 'Amalia Mendoza', 'Pedro Fernandez', 'Lucero', 'Paquita la del Barrio', 'Leonardo Aguilar',
      'Majo Aguilar', 'Joan Sebastian', 'Ana Gabriel', 'Lila Downs', 'Tito Guizar', 'Luis Aguilar', 'Juan Valentin',
      'Ezequiel Pena', 'Yolanda del Rio', 'Beatriz Adriana', 'Alicia Villarreal', 'Pedrito Fernandez', 'Antonio Bribiesca',
      'Lucha Reyes', 'Jose Luis Rodriguez', 'Nati Cano', 'Mariachi Sol de Mexico', 'Mariachi Los Camperos',
    ],
  },
  {
    id: 'corridos', group: 'Música mexicana', label: 'Corridos', emoji: '🐎', family: MEXICANA, keyword: /corrido/,
    artists: [
      'Peso Pluma', 'Natanael Cano', 'Junior H', 'Fuerza Regida', 'Gabito Ballesteros', 'Tito Double P', 'Eslabon Armado',
      'Luis R Conriquez', 'Chalino Sanchez', 'El Komander', 'Gerardo Ortiz', 'Ariel Camacho', 'Los Tucanes de Tijuana',
      'Los Tigres del Norte', 'Grupo Laberinto', 'Valentin Elizalde', 'Lenin Ramirez', 'Codiciado', 'T3R Elemento',
      'Oscar Maydon', 'Xavi', 'Grupo Arriesgado', 'Legado 7', 'Alta Consigna', 'El Makabelico', 'Los Dareyes de la Sierra',
      'Herencia de Patrones', 'Jasiel Nunez', 'Ivan Cornejo', 'Chuy Montana', 'Marca MP', 'Calle 24',
      'Los Gemelos de Sinaloa', 'El Tigrillo Palma', 'Los Cuates de Sinaloa', 'Edgardo Nunez', 'Fuerza de Tijuana',
      'Clave Especial', 'Victor Valverde', 'Panter Belico', 'Neton Vega', 'Uriel Barrera',
    ],
  },
  {
    id: 'grupera', group: 'Música mexicana', label: 'Grupera', emoji: '💔', family: MEXICANA, keyword: null,
    artists: [
      'Los Temerarios', 'Bronco', 'Los Bukis', 'Marco Antonio Solis', 'Los Yonics', 'Grupo Bryndis', 'Los Mier',
      'Liberacion', 'Los Acosta', "Los Freddy's", 'Ana Barbara', 'Limite', 'Alicia Villarreal', 'Los Caminantes',
      'Los Rehenes', 'Industria del Amor', 'Grupo Pegasso', 'Grupo Mojado', 'Los Baron de Apodaca', 'Selena',
      'Grupo Ladron', 'Los Angeles Azules', 'Los Askis', 'Los Terricolas', 'Los Muecas', 'Grupo Yndio', 'Los Babys',
      'Joan Sebastian', 'Jenni Rivera', 'Patricia Navidad', 'Graciela Beltran', 'Priscila y sus Balas de Plata',
      'Laura Leon', 'Yuridia', 'Grupo Ilusion', 'Los Pasteles Verdes', 'Los Angeles Negros', 'Grupo Kual',
      'Super Lamas', 'Los Fugitivos', 'Grupo Toppaz', 'Grupo Socio', 'Los Rieleros del Norte',
    ],
  },
  { id: 'mexicana', group: 'Música mexicana', label: 'Toda la mexicana', emoji: '🇲🇽', hint: 'banda, norteño, mariachi, corridos, grupera', match: MEXICANA },

  // ---------- Otros ----------
  // Estos géneros también se validan por artista. Si un artista está en la lista de OTRO género de este grupo,
  // no entra aquí (así no se mezcla reggaetón con pop). Para artistas que no están en ninguna lista se usa
  // el género que da Apple Music.
  {
    id: 'urbano', group: 'Otros', label: 'Reggaetón / urbano', emoji: '🔥', hint: 'reggaetón, trap latino, dembow', exclusive: true,
    match: /urban|reggaet|latin hip|hip.?hop|rap|trap|dembow/,
    artists: [
      'Bad Bunny', 'Daddy Yankee', 'J Balvin', 'Ozuna', 'Anuel AA', 'Karol G', 'Maluma', 'Nicky Jam', 'Wisin & Yandel',
      'Wisin y Yandel', 'Wisin', 'Yandel', 'Don Omar', 'Feid', 'Rauw Alejandro', 'Myke Towers', 'Farruko', 'Arcangel',
      'Sech', 'Zion & Lennox', 'Zion y Lennox', 'Plan B', 'Ivy Queen', 'Jhayco', 'Jhay Cortez', 'Tego Calderon', 'Mora',
      'Eladio Carrion', 'Young Miko', 'Blessd', 'Ryan Castro', 'Lunay', 'Justin Quiles', 'Jowell & Randy', 'Jowell y Randy',
      'Natti Natasha', 'Becky G', 'Manuel Turizo', 'De La Ghetto', 'Cosculluela', 'Ñengo Flow', 'Lenny Tavarez', 'Dalex',
      'Kevvo', 'Chencho Corleone', 'Alexis & Fido', 'Alexis y Fido', 'RKM & Ken-Y', 'Ken-Y', 'Hector el Father',
      'Baby Rasta & Gringo', 'Tito El Bambino', 'Jory Boy', 'Brray', 'Dei V', 'Rels B', 'Bizarrap', 'Duki',
      'Nicki Nicole', 'Tiago PZK', 'Maria Becerra', 'Emilia', 'Trueno', 'Paulo Londra', 'Rochy RD', 'El Alfa',
      'Tokischa', 'Chimbala', 'Sean Paul', 'Pitbull', 'Gente de Zona', 'Cazzu', 'Anitta', 'Kim Loaiza',
      'Dani Flow', 'Bellakath', 'Uzielito Mix', 'El Malilla', 'Yeri Mua', 'Alemán', 'Santa Fe Klan', 'C-Kan',
      'Cartel de Santa', 'Gera MX', 'Sabino', 'Lefty SM', 'Bhavi', 'Khea', 'Nio Garcia', 'Casper Magico', 'Darell',
      'Brytiago', 'Bryant Myers', 'Jay Wheeler', 'Miky Woodz', 'Totoy El Frio', 'Saiko', 'Omar Courtz', 'Dímelo Flow',
      'Sky Rompiendo', 'Tainy', 'Lyanno', 'Cauty', 'Zion', 'Lennox', 'J Alvarez', 'Gotay', 'Arcangel & De La Ghetto',
      'Chino & Nacho', 'Chino y Nacho',
    ],
  },
  {
    id: 'pop-es', group: 'Otros', label: 'Pop en español', emoji: '🎤', hint: 'pop latino, de antes y de ahora', exclusive: true,
    match: /pop en espanol|pop latino|latin pop/,
    artists: [
      'Shakira', 'Sebastian Yatra', 'Camilo', 'Reik', 'CNCO', 'Danna Paola', 'Danna', 'Aitana', 'TINI', 'Morat',
      'Carlos Vives', 'Ricky Martin', 'Enrique Iglesias', 'Luis Fonsi', 'Natalia Lafourcade', 'Kany Garcia', 'Jesse & Joy',
      'Jesse y Joy', 'Sin Bandera', 'Ha*Ash', 'HA-ASH', 'Paulina Rubio', 'Thalia', 'Gloria Trevi', 'Belinda',
      'Alejandro Sanz', 'Juanes', 'Pablo Alboran', 'Mon Laferte', 'Julieta Venegas', 'Kenia Os', 'Luis Miguel',
      'Cristian Castro', 'RBD', 'Yuridia', 'Chayanne', 'Mau y Ricky', 'Lasso', 'Rosalia', 'Alejandra Guzman', 'Fey',
      'Timbiriche', 'OV7', 'Kabah', 'Flans', 'Pandora', 'Sentidos Opuestos', 'JNS', 'Magneto', 'Menudo', 'Mercurio',
      'Garibaldi', 'Benny Ibarra', 'Kalimba', 'Aleks Syntek', 'Lucero', 'Yuri', 'Laura Pausini', 'Nicole Zignago',
      'Carla Morrison', 'Leonel Garcia', 'Noel Schajris', 'Matisse', 'Kevin Kaarl', 'Ximena Sariñana', 'Carlos Rivera',
      'Emmanuel', 'Mijares', 'Fonseca', 'Abraham Mateo',
      'David Bisbal', 'Alvaro Soler', 'Pedro Capo', 'Franco de Vita', 'Ricardo Arjona', 'La Oreja de Van Gogh',
      'Amaral', 'Malu', 'Lola Indigo', 'Ana Torroja', 'Mecano', 'Bacilos', 'Diego Torres', 'Axel', 'Ricardo Montaner',
      'Evaluna', 'Mau & Ricky', 'Greeicy', 'Piso 21', 'Cami', 'Joaquina', 'Ela Taubert', 'Elsa y Elmar', 'Rawayana',
      'Natalia Jimenez', 'La 5a Estacion', 'Playa Limbo', 'Camila', 'Rio Roma', 'Jesse Baez', 'Paty Cantu',
    ],
  },
  {
    id: 'rock-es', group: 'Otros', label: 'Rock en español', emoji: '🤘', hint: 'rock y alternativo en español', exclusive: true,
    match: /rock en espanol|rock latino|latin rock|latin alternative|alternativa y rock/,
    artists: [
      'Soda Stereo', 'Caifanes', 'Mana', 'Cafe Tacvba', 'Cafe Tacuba', 'Heroes del Silencio', 'Enanitos Verdes',
      'Los Prisioneros', 'Molotov', 'Zoe', 'El Tri', 'Jaguares', 'Hombres G', 'Los Fabulosos Cadillacs', 'Panteon Rococo',
      'La Ley', 'Fobia', 'Kinky', 'Elefante', 'Gustavo Cerati', 'Babasonicos', 'Moderatto', 'Division Minuscula',
      'Porter', 'Siddhartha', 'Love of Lesbian', 'Vilma Palma e Vampiros', 'Charly Garcia', 'Fito Paez',
      'Andres Calamaro', 'Los Bunkers', 'Jumbo', 'Coda', 'Maldita Vecindad', 'Los Rodriguez', 'Enjambre', 'Allison',
      'Ely Guerra', 'Plastilina Mosh', 'Control Machete', 'Austin TV', 'La Gusana Ciega', 'Neon Walrus', 'Los Amigos Invisibles',
      'Aterciopelados', 'Bersuit Vergarabat', 'Los Autenticos Decadentes', 'Attaque 77', 'Los Piojos', 'La Renga',
      'Los Enanitos Verdes', 'Miguel Rios', 'Loquillo', 'Los Secretos', 'Duncan Dhu', 'Radio Futura', 'Nacha Pop',
      'Los Hombres G', 'Saratoga', 'Mago de Oz', 'Extremoduro', 'Fito y Fitipaldis', 'Estopa', 'El Canto del Loco',
      'Pignoise', 'Leiva', 'Vetusta Morla', 'Los Caligaris', 'Cuarteto de Nos', 'No Te Va Gustar', 'Bunbury',
      'Enrique Bunbury', 'Saul Hernandez', 'Alex Lora', 'Rata Blanca', 'Los Tres', 'Lucybell', 'Inspector', 'Sussie 4',
      'Panda', 'PXNDX', 'Los Concorde', 'Hello Seahorse!', 'Technicolor Fabrics', 'Odisseo', 'Los Daniels', 'DLD',
      'Reik Rock', 'Victimas del Doctor Cerebro', 'Tijuana No!', 'La Lupita', 'Cuca', 'Botellita de Jerez',
    ],
  },
  {
    id: 'baladas', group: 'Otros', label: 'Baladas y boleros', emoji: '🌙', hint: 'baladas románticas y boleros', exclusive: true,
    match: /balada|bolero/,
    artists: [
      'Jose Jose', 'Camilo Sesto', 'Raphael', 'Juan Gabriel', 'Rocio Durcal', 'Emmanuel', 'Mijares',
      "Lupita D'Alessio", 'Jose Luis Perales', 'Nino Bravo', 'Roberto Carlos', 'Julio Iglesias', 'Dyango',
      'Isabel Pantoja', 'Ana Gabriel', 'Marco Antonio Solis', 'Franco de Vita', 'Ricardo Montaner', 'Ricardo Arjona',
      'Laura Pausini', 'Eros Ramazzotti', 'Armando Manzanero', 'Los Panchos', 'Trio Los Panchos', 'Lucho Gatica',
      'Daniela Romo', 'Yuri', 'Pandora', 'Lucia Mendez', 'Myriam', 'Napoleon', 'Il Divo', 'Joan Manuel Serrat',
      'Sergio Dalma', 'Luis Miguel', 'Cristian Castro', 'Alejandro Fernandez', 'Jose Feliciano', 'Leo Dan',
      'Sandro', 'Palito Ortega', 'Leonardo Favio', 'Jose Augusto', 'Manoella Torres', 'Amanda Miguel', 'Diego Verdaguer',
      'Braulio', 'Yolandita Monge', 'Rocio Jurado', 'Paloma San Basilio', 'Basilio', 'Jeanette', 'Ednita Nazario',
      'Chayanne', 'Alejandro Sanz', 'Ricardo Arjona', 'Marisela', 'Valeria Lynch', 'Manuel Mijares', 'Pedro Infante',
      'Javier Solis', 'Agustin Lara', 'Maria Grever', 'Los Dandys', 'Los Tres Ases', 'Los Tres Diamantes',
      'Tania Libertad', 'Eugenia Leon', 'Guadalupe Pineda', 'Fernando Allende', 'Jose Luis Rodriguez', 'El Puma',
      'Sin Bandera', 'Kalimba', 'Carlos Rivera', 'Rio Roma', 'Reyli', 'Benny Ibarra', 'Pepe Aguilar',
      'Ricardo Montaner', 'Enrique Guzman', 'Cesar Costa',
      'Angelica Maria', 'Alberto Vazquez', 'Los Angeles Negros', 'Los Terricolas', 'Los Pasteles Verdes', 'Los Iracundos',
    ],
  },
  {
    id: 'pop-en', group: 'Otros', label: 'Pop en inglés', emoji: '🇺🇸', hint: 'pop en inglés de antes y de ahora', exclusive: true,
    match: /^(pop|dance|disco|electronica?|k-pop|pop\/rock|teen pop|adult contemporary|r&b\/soul|soul|r&b)$/,
    artists: [
      'Taylor Swift', 'Ed Sheeran', 'Dua Lipa', 'The Weeknd', 'Bruno Mars', 'Adele', 'Ariana Grande', 'Billie Eilish',
      'Harry Styles', 'Lady Gaga', 'Katy Perry', 'Rihanna', 'Beyonce', 'Michael Jackson', 'Madonna', 'Whitney Houston',
      'Mariah Carey', 'Britney Spears', 'Backstreet Boys', 'NSYNC', '*NSYNC', 'Justin Bieber', 'Miley Cyrus',
      'Olivia Rodrigo', 'Sabrina Carpenter', 'Maroon 5', 'One Direction', 'Sia', 'Shawn Mendes', 'Celine Dion',
      'ABBA', 'Spice Girls', 'Elton John', 'George Michael', 'Wham!', 'Cyndi Lauper', 'Christina Aguilera',
      'Jennifer Lopez', 'Selena Gomez', 'Demi Lovato', 'Jonas Brothers', 'Hannah Montana', 'High School Musical',
      'Camila Cabello', 'Fifth Harmony', 'Little Mix', 'Charli XCX', 'Chappell Roan', 'Doja Cat', 'SZA',
      'Lizzo', 'Meghan Trainor', 'Ellie Goulding', 'Rita Ora', 'Lana Del Rey', 'Lorde', 'Halsey', 'Kesha',
      'Pink', 'P!nk', 'Avril Lavigne', 'Kelly Clarkson', 'Hilary Duff', 'Jessie J', 'Sam Smith', 'Lewis Capaldi',
      'James Arthur', 'John Legend', 'Alicia Keys', 'Usher', 'Justin Timberlake', 'Prince', 'Stevie Wonder',
      'Lionel Richie', 'Phil Collins', 'Tina Turner', 'Gloria Gaynor', 'Donna Summer', 'Bee Gees', 'Village People',
      'Boney M', 'Kylie Minogue', 'Cher', 'Roxette', 'a-ha', 'Duran Duran', 'Tears for Fears', 'Culture Club',
      'Pet Shop Boys', 'Eurythmics', 'The Bangles', 'Belinda Carlisle', 'Wham', 'Rick Astley', 'Hall & Oates',
      'BTS', 'BLACKPINK', 'Coldplay', 'OneRepublic', 'Imagine Dragons', 'Twenty One Pilots', 'Lukas Graham', 'Benson Boone',
      'Teddy Swims', 'Tate McRae', 'Gracie Abrams', 'Rosé', 'Jung Kook', 'The Chainsmokers', 'Calvin Harris', 'Avicii',
    ],
  },
  {
    id: 'rock-en', group: 'Otros', label: 'Rock en inglés', emoji: '🎸', hint: 'rock clásico, alternativo y metal en inglés', exclusive: true,
    match: /^(rock|hard rock|metal|heavy metal|punk|alternativa|alternative|classic rock|rock y alternativo|indie rock|grunge|rock alternativo)$/,
    artists: [
      'Queen', 'The Beatles', "Guns N' Roses", 'Guns N Roses', 'Bon Jovi', 'AC/DC', 'Nirvana', 'Metallica', 'Linkin Park',
      'Green Day', 'The Rolling Stones', 'Led Zeppelin', 'Aerosmith', 'Pink Floyd', 'Red Hot Chili Peppers', 'Foo Fighters',
      'The Killers', 'Arctic Monkeys', 'Oasis', 'U2', 'Journey', 'Scorpions', 'Kiss', 'Deep Purple', 'The Cranberries',
      'Evanescence', 'Paramore', 'Blink-182', 'The Police', 'Def Leppard', 'Van Halen', 'Survivor', 'Europe', 'Toto',
      'R.E.M.', 'The Doors', 'Creedence Clearwater Revival', 'My Chemical Romance', 'Muse', 'Radiohead', 'The Cure',
      'Depeche Mode', 'The Smiths', 'Pearl Jam', 'Soundgarden', 'Alice in Chains', 'Stone Temple Pilots', 'Bush',
      'The Offspring', 'Sum 41', 'Simple Plan', 'Fall Out Boy', 'Panic! at the Disco', 'All Time Low', '30 Seconds to Mars',
      'Thirty Seconds to Mars', 'System of a Down', 'Rage Against the Machine', 'Korn', 'Limp Bizkit', 'Iron Maiden',
      'Black Sabbath', 'Ozzy Osbourne', 'Judas Priest', 'Motley Crue', 'Poison', 'Whitesnake', 'Bonnie Tyler',
      'Pat Benatar', 'Joan Jett', 'Heart', 'Fleetwood Mac', 'Eagles', 'The Who', 'The Clash', 'Ramones', 'Sex Pistols',
      'David Bowie', 'Bruce Springsteen', 'Billy Joel', 'Elvis Presley', 'Chuck Berry', 'The Beach Boys', 'Kansas',
      'Boston', 'Foreigner', 'REO Speedwagon', 'Styx', 'Chicago', 'Dire Straits', 'Sting', 'Bryan Adams', 'INXS',
      'The Strokes', 'The White Stripes', 'Kings of Leon', 'Franz Ferdinand', 'Snow Patrol', 'Keane', 'Kaiser Chiefs',
      'The Fray', 'Nickelback', 'Creed', '3 Doors Down', 'Matchbox Twenty', 'Goo Goo Dolls', 'Train', 'The Calling',
      'Lifehouse', 'Daughtry', 'Three Days Grace', 'Breaking Benjamin', 'Papa Roach', 'Avenged Sevenfold', 'Slipknot',
      'Maneskin', 'Greta Van Fleet', 'The Black Keys', 'Florence + The Machine', 'Hozier', 'No Doubt', 'Garbage',
    ],
  },
  { id: 'ochentas', group: 'Otros', label: 'Ochenteras', emoji: '🕺', hint: 'canciones lanzadas de 1978 a 1992', years: [1978, 1992] },
  {
    id: 'infantil', group: 'Otros', label: 'Infantiles', emoji: '🧸', hint: 'canciones para niños', exclusive: true,
    match: /infantil|children|ninos|kids|para ninos/,
    artists: [
      'Cri-Cri', 'Cri Cri', 'Francisco Gabilondo Soler', 'Topa', 'Diego Topa', 'CantaJuego', 'Pinkfong', 'Cocomelon',
      'El Payaso Plim Plim', 'Plim Plim', 'Xuxa', 'Miliki', 'Gaby Fofo y Miliki', 'Payasos de la Tele', 'Tatiana',
      'Canticos', 'El Reino Infantil', 'La Granja de Zenon', 'Super Simple Songs', 'Mundo Bita', 'Los Pitufos',
      'Enanitos', 'Barney', 'Disney', 'Encanto', 'Frozen', 'Topo Gigio', 'Chabelo', 'Parchis', 'Timbiriche Infantil',
      'Cepillin', 'Tatiana', 'Juana la Iguana', 'Bichikids', 'Dulces Melodias', 'Toy Cantando', 'Little Baby Bum',
      'Mi Perro Chocolo', 'Pica-Pica', 'Pocoyo', 'Peppa Pig', 'Bluey', 'Paw Patrol', 'Patrulla Canina', 'Hi-5',
      'Lunacreciente', 'Atención Atención', 'Canciones del Zoo', 'El Monstruo de la Laguna',
    ],
  },
];
