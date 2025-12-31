// fs = file system
const fs = require("fs");
const { extname } = require("path");

const path = process.argv;
const link = path[2];

fs.readFile(link, "utf-8", (err, text) => {
  if (err) throw err;
  quebraEmParagrafos(text);
});

function quebraEmParagrafos(text) {
  const paragrafos = text.toLowerCase().split("\n");
  const contagem = paragrafos.map((paragrafo) => {
    return verificaPalavrasDuplicadas(paragrafo);
  });
}

/* 
  - criar um array com as palavras
  - contar as ocorrencias
  - montar um objeto com o resultado
  {
    "web": 5,
    "computador": 4,
    ...
  }
*/

function verificaPalavrasDuplicadas(text) {
  const listaPalavras = text.split(" ");
  const resultado = {};

  listaPalavras.forEach((palavra) => {
    resultado[palavra] = (resultado[palavra] || 0) + 1;
  });

  return resultado;
}

// Exemplo prático de uso
const frase = "JavaScript é muito poderoso";

const palavras = frase.split(" ");

console.log(palavras);

// Resultado
["JavaScript", "é", "muito", "poderoso"];
