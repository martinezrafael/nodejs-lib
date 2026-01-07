import fs from "fs";
import path from "path";
import trataErros from "./erros/funcoesErro.js";
import { contaPalavras } from "./index.js";
import { montaSaidaArquivo } from "./helpers.js";
import { Command } from "commander";

const program = new Command();

program
  .version("0.0.1")
  .option("-t, --text <string>", "caminho do texto a ser processado")
  .option(
    "-d, --destino <string>",
    "caminho da pasta onde salvar o arquivo de resultados"
  )
  .action((options) => {
    const { text, destino } = options;

    if (!text || !destino) {
      console.error("erro: favor inserir caminho de origem e destino");
      program.help();
      return;
    }

    const caminhoTexto = path.resolve(text);
    const caminhoDestino = path.resolve(destino);

    try {
      processaArquivo(caminhoTexto, caminhoDestino);
      console.log("Texto processado com sucesso!");
    } catch (error) {
      console.log("Ocorreu um erro no processamento", error);
    }
  });

program.parse();

function processaArquivo(texto, destino) {
  fs.readFile(texto, "utf-8", (err, text) => {
    try {
      if (err) throw err;
      const resultado = contaPalavras(text);
      criaESalvaArquivo(resultado, destino);
    } catch (err) {
      trataErros(err);
    }
  });
}

async function criaESalvaArquivo(listaPalavras, endereco) {
  const arquivoNovo = `${endereco}/resultado.txt`;
  const textoPalavras = montaSaidaArquivo(listaPalavras);
  try {
    await fs.promises.writeFile(arquivoNovo, textoPalavras);
    console.log("Arquivo criado!");
  } catch (err) {
    throw err;
  }
}
