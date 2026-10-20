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
  { id: 'urbano', group: 'Otros', label: 'Reggaetón / urbano', emoji: '🔥', hint: 'reggaetón, trap latino', match: /urban|reggae|latin hip|hip.?hop|rap|trap/ },
  { id: 'pop-es', group: 'Otros', label: 'Pop en español', emoji: '🎤', match: /pop en espanol|pop latino|latin pop/ },
  { id: 'rock-es', group: 'Otros', label: 'Rock en español', emoji: '🤘', match: /rock en espanol|rock latino|latin rock|latin alternative/ },
  { id: 'baladas', group: 'Otros', label: 'Baladas y boleros', emoji: '🌙', match: /balada|bolero/ },
  { id: 'pop-en', group: 'Otros', label: 'Pop en inglés', emoji: '🇺🇸', match: /^(pop|dance|disco|electronica?|k-pop|pop\/rock|teen pop|adult contemporary)$/ },
  { id: 'rock-en', group: 'Otros', label: 'Rock en inglés', emoji: '🎸', match: /^(rock|hard rock|metal|heavy metal|punk|alternativa|alternative|classic rock|rock y alternativo|indie rock|grunge)$/ },
  { id: 'ochentas', group: 'Otros', label: 'Ochenteras', emoji: '🕺', hint: 'canciones lanzadas de 1978 a 1992', years: [1978, 1992] },
  { id: 'infantil', group: 'Otros', label: 'Infantiles', emoji: '🧸', match: /infantil|children|ninos|kids/ },
];
