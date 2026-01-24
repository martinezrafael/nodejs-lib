import "dotenv/config";
import OpenAI from "openai";
import { execSync } from "child_process";
import axios from "axios";
import readline from "readline";

/**
 * =========================
 * Configuração Groq (Llama)
 * =========================
 */
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

/**
 * =========================
 * Configuração LinkedIn
 * =========================
 */
const LINKEDIN_ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;

if (!LINKEDIN_ACCESS_TOKEN) {
  console.error("❌ LINKEDIN_ACCESS_TOKEN não configurado.");
  process.exit(1);
}

/**
 * =========================
 * Buscar Person URN
 * =========================
 */
async function getPersonUrn() {
  const { data } = await axios.get("https://api.linkedin.com/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
    },
  });

  if (!data?.sub) {
    throw new Error("Não foi possível obter o Person URN (sub).");
  }

  return `urn:li:person:${data.sub}`;
}

/**
 * =========================
 * Publicar no LinkedIn
 * =========================
 */
async function postToLinkedIn(authorUrn, text) {
  const url = "https://api.linkedin.com/v2/ugcPosts";

  const body = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: {
          text,
        },
        shareMediaCategory: "NONE",
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  return axios.post(url, body, {
    headers: {
      Authorization: `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
      "X-Restli-Protocol-Version": "2.0.0",
      "Content-Type": "application/json",
    },
  });
}

/**
 * =========================
 * Execução principal
 * =========================
 */
async function run() {
  try {
    // 1. Captura o diff do Git
    const diff = execSync("git diff --cached").toString();

    if (!diff.trim()) {
      console.log("⚠️  Nada no stage! Use 'git add' primeiro.");
      return;
    }

    console.log("🤖 Gerando post com Llama 3.3 via Groq...");

    // 2. IA gera o conteúdo do post
    const chat = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "Você é um desenvolvedor experiente. Escreva posts profissionais para o LinkedIn em Português. Seja conciso, use emojis e hashtags. Não invente tecnologias que não aparecem no código.",
        },
        {
          role: "user",
          content: `Crie um post sobre estas alterações de código:\n\n${diff.substring(
            0,
            2000,
          )}`,
        },
      ],
    });

    const postContent = chat.choices[0].message.content;

    console.log("\n--- 📝 POST SUGERIDO ---\n");
    console.log(postContent);
    console.log("\n------------------------");

    // 3. Confirmação do usuário
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question("\n🚀 Publicar no LinkedIn? (s/n): ", async (ans) => {
      if (ans.toLowerCase() === "s") {
        try {
          console.log("🔍 Obtendo Person URN...");
          const authorUrn = await getPersonUrn();

          await postToLinkedIn(authorUrn, postContent);
          console.log("\n✅ SUCESSO! Post publicado no LinkedIn.");
        } catch (err) {
          console.error("\n❌ ERRO NA PUBLICAÇÃO:");
          if (err.response) {
            console.error(JSON.stringify(err.response.data, null, 2));
          } else {
            console.error(err.message);
          }
        }
      } else {
        console.log("\n❌ Post cancelado.");
      }
      rl.close();
    });
  } catch (err) {
    console.error("❌ Erro fatal:", err.message);
  }
}

run();
