const fs = require("fs");
const trataErros = require("./erros/funcoesErro");

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
