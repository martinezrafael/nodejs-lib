const fs = require("fs");

// fs = file system

const path = process.argv;
const link = path[2];

fs.readFile(link, "utf-8", (err, text) => {
  verificaPalavrasDuplicadas(text);
});

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

  console.log(resultado);
}
