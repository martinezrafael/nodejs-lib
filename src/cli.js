import fs from "fs";
import trataErros from "./erros/funcoesErro.js";
import { contaPalavras } from "./index.js";

const path = process.argv;
const link = path[2];

fs.readFile(link, "utf-8", (err, text) => {
  try {
    if (err) throw err;
    contaPalavras(text);
  } catch (err) {
    trataErros(err);
  }
});
