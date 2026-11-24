/* Textos en inglés. El español vive en el HTML y main.js lo copia al cargar. */
window.I18N_EN = {
  __title: "Mariano Trevisan",
  __desc: "Portfolio of Mariano Trevisan, Computer Engineering student at FICH: low-level systems, embedded work and software in production.",

  skip: "Skip to projects",
  navLabel: "Sections",
  navProjects: "Projects",
  navTools: "Tools",
  navContact: "Contact",

  lede: "I study Computer Engineering at FICH, in Argentina. I'm drawn to low-level systems, embedded work and security, and to building software that people use every day.",
  where: "Santa Fe, Argentina",

  factsLabel: "About",
  factDegreeT: "Degree",
  factDegree: "Computer Engineering (Ingeniería en Informática) at FICH, Universidad Nacional del Litoral.",
  factFocusT: "Interests",
  factFocus: "Computer architecture, embedded systems and security in web and mobile apps.",
  factShipT: "Real-world work",
  factShip: "An online store with an admin panel for a company, and an Android app for vets that reads a Bluetooth scale.",
  factLangT: "Languages",
  factLang: "Spanish (native), English (B2).",

  projectsTitle: "Projects",

  metSub: "Online store and admin panel for a company. 2026 to today.",
  metBody: "A store built from scratch, with no CMS, for a gate motor manufacturer in the Avellaneda Industrial Park, Santa Fe.",
  metP1: "Layered architecture on Node.js and PostgreSQL (Neon): business logic, data access and presentation stay apart.",
  metP2: "Guest checkout: no customer accounts or card data are stored.",
  metP3: "Admin panel with two-factor authentication, change tracking and input validation against injection attacks.",  metImg1: "Store home page.",
  metImg1Alt: "Equipos MET home page with the headline “Lo fabricamos nosotros” (we make it ourselves) and an MP300 sliding gate kit for sale.",
  metImg2: "Catalog categories.",
  metImg2Alt: "Category section: sliding gate motors, lawn mowers, lift gate motors, pump motors and fans.",
  metImg3: "Gear motor section.",
  metImg3Alt: "Dark section describing the gear motor inside: 0.5 HP, 4 bearings, up to 50 remotes and gates up to 500 kg.",
  metImg4: "Products and spare parts menu.",
  metImg4Alt: "Products dropdown with gates, garden, motors and home, spare parts and a remote control on sale.",
  metImg5: "Company page.",
  metImg5Alt: "Company page with the headline “Fabricamos lo que vendemos” (we make what we sell) and photos of gears and lawn mowers.",
  metImg6: "Admin panel. I pixelated the sales figures.",
  metImg6Alt: "Admin panel overview with daily sales, best sellers and pending orders. The figures are pixelated.",

  sbSub: "Scale and dosage app for veterinary clinics, on Android.",
  sbBody: "A tablet app that reads the weight from a Bluetooth scale and saves it to the patient's record. We migrated it screen by screen from Xamarin/.NET to Ionic, Angular and Capacitor.",
  sbP1: "Native Capacitor plugin that reads a Bluetooth Low Energy scale live, plus a simulated scale for testing without the hardware.",
  sbP2: "Patient records, clinical notes and weight-based dosage and food ration calculations, all stored offline.",  sbImg: "Weighing, patient record and scale connection, in light and dark themes.",
  sbImgAlt: "Five SmartBalance screens: a weighing in progress, a dog's record with its weight chart, the simulated scale settings, and the same views in dark theme.",

  tankTitle: "Ultrasonic tank level sensor",
  tankSub: "Final project for Computer Organization, 2026.",
  tankBody: "A water tank level monitor built on an ESP32-C3 SuperMini, with an HC-SR04 sensor, a buzzer alarm and UART output to a PC.",
  tankP1: "Firmware split between C (ESP-IDF) and hand-written RISC-V assembly that drives the buzzer.",  tankRange: "Water level in the simulation",
  tankDist: "Measured distance",
  tankLevel: "Level",
  tankNote: "Illustration: the sensor sits at the top and measures the distance down to the water.",

  othersTitle: "Other work",
  umlName: "UML diagram validator",
  umlDesc: "Prototype that checks whether a UML diagram is correct by modeling it as a formal language, with grammars and shift-reduce parsing.",
  rvName: "RISC-V and C++",
  rvDesc: "Algorithms, memory and register handling written in RISC-V assembly. In C++, template-based applications, a custom binary file class and desktop interfaces.",

  toolsTitle: "Tools",
  toolsLangT: "Languages",
  toolsTechT: "Frameworks and platforms",
  toolsAreasT: "Areas",
  toolsAreas: "Embedded systems, low-level analysis, computer architecture, cybersecurity fundamentals, web and mobile app security, API development, layered architecture, UX/UI design and software engineering (UML, GRASP, architectural patterns).",

  contactTitle: "Contact",
  contactText: "If you have an internship, a project or a question, message me on LinkedIn. The code is on GitHub.",
  colophon: "All made with lots of ❤️ and ☕ in the city of Santa Fe, Argentina",
  close: "Close"
};
