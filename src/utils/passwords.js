export const PASSWORD_WORDS = [
  "LUNA", "GATO", "PATO", "LOBO", "FOCA", "TORO", "PUMA", "RANA", "SAPO", "LEON", 
  "FLOR", "AGUA", "AIRE", "HOJA", "RAMA", "PINO", "MARS", "NOVA", "ARCO", "NUBE", 
  "RAYO", "ROCA", "LAGO", "RIOS", "OLAS", "ISLA", "JOYA", "RUBI", "GEMA", "MINA",
  "SOLA", "ALMA", "MOTO", "AUTO", "CASA", "TREN", "BARC", "VELA", "FARO", "MAPA"
];

export const getRandomPassword = () => {
  const index = Math.floor(Math.random() * PASSWORD_WORDS.length);
  return PASSWORD_WORDS[index];
};
