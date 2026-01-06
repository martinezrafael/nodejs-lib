import fs from "fs";
import trataErros from "./erros/funcoesErro.js";
import { contaPalavras } from "./index.js";

const path = process.argv;
const link = path[2];
const endereco = path[3];

fs.readFile(link, "utf-8", (err, text) => {
  try {
    if (err) throw err;
    const resultado = contaPalavras(text);
    criaESalvaArquivo(resultado, endereco);
  } catch (err) {
    trataErros(err);
  }
});

async function criaESalvaArquivo(listaPalavras, endereco) {
  const arquivoNovo = `${endereco}/resultado.txt`;
  const textoPalavras = JSON.stringify(listaPalavras);
  try {
    await fs.promises.writeFile(arquivoNovo, textoPalavras);
    console.log("Arquivo criado!");
  } catch (err) {
    throw err;
  }
}
