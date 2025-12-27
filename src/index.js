const fs = require("fs");

// fs = file system

const path = process.argv;
const link = path[2];

fs.readFile(link, "utf-8", (err, text) => {
  quebraEmParagrafos(text);
  // verificaPalavrasDuplicadas(text);
});

function quebraEmParagrafos(text) {
  const paragrafos = text.toLowerCase().split("\n");
  const contagem = paragrafos.map((paragrafo) => {
    return verificaPalavrasDuplicadas(paragrafo);
  });
  console.log(contagem);
}

// criar um array com as palavras
// contar as ocorrencias
// montar um objeto com o resultado
/*{
  "web": 5,
  "computador": 4
}*/
function verificaPalavrasDuplicadas(text) {
  const listaPalavras = text.split(" ");
  const resultado = {};
  // objeto[propriedade] = valor;

  listaPalavras.forEach((palavra) => {
    resultado[palavra] = (resultado[palavra] || 0) + 1;
  });

  return resultado;
}
