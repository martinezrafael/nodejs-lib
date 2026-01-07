# Node.js Word Counter Library

> Uma biblioteca e ferramenta de linha de comando para contar a ocorrência de palavras em arquivos de texto.

Este projeto é uma ferramenta CLI (Command Line Interface) construída em Node.js que processa arquivos de texto (`.txt`) para contar a frequência de cada palavra.

## ✨ Funcionalidades

- Processamento de arquivos de texto via CLI.
- Contagem de palavras, ignorando palavras com menos de 3 caracteres.
- Agrupamento de palavras por parágrafo.
- Geração de um arquivo `resultado.txt` com a contagem final.

## 📦 Instalação

Para configurar e usar este projeto localmente, siga os passos abaixo:

1.  **Clone o repositório:**

    ```bash
    git clone https://github.com/martinezrafael/nodejs-lib.git
    ```

2.  **Navegue até o diretório do projeto:**

    ```bash
    cd nodejs-lib
    ```

3.  **Instale as dependências:**

    ```bash
    npm install
    ```

## 💻 Como Usar

A ferramenta é executada através da linha de comando. Você precisa fornecer o caminho para o arquivo de texto de origem e o caminho para a pasta de destino onde o resultado será salvo.

### Sintaxe

```bash
node src/cli.js -t <caminho-do-arquivo> -d <pasta-de-destino>
```

### Exemplo

Supondo que você tenha um arquivo de texto em `arquivos/texto-web.txt` e queira salvar o resultado na pasta `resultados/`:

```bash
node src/cli.js -t ./arquivos/texto-web.txt -d ./resultados
```

Após a execução, um novo arquivo chamado `resultado.txt` será criado dentro da pasta `./resultados` com a contagem de palavras.

## 🛠️ Tecnologias Utilizadas

- [Node.js](https://nodejs.org/)
- [Commander.js](https://github.com/tj/commander.js/) - Para a criação da interface de linha de comando.
- [Chalk](httpss://github.com/chalk/chalk) - Para estilizar as saídas no terminal.

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir uma _issue_ ou enviar um _pull request_.

## 📜 Licença

Este projeto está sob a licença ISC.
