import fs from "fs";
import path from "path";
import axios from "axios";
import FormData from "form-data";
import dotenv from "dotenv";
import readline from "readline";
import { execSync } from "child_process";
import OpenAI from "openai";

dotenv.config();

/* --------------------------------------------------
 * Paths & Constants
 * -------------------------------------------------- */

const LINKEDIN_API = "https://api.linkedin.com/v2";
const ROOT_DIR = process.cwd();
const IMAGES_DIR = path.join(ROOT_DIR, "images");
const PROMPT_CONFIG_PATH = path.join(ROOT_DIR, "prompt.config.json");

/* --------------------------------------------------
 * Load prompt.config.json
 * -------------------------------------------------- */

function loadPromptConfig() {
  try {
    return JSON.parse(fs.readFileSync(PROMPT_CONFIG_PATH, "utf-8"));
  } catch (err) {
    console.error("❌ Erro ao carregar prompt.config.json");
    console.error(err.message);
    process.exit(1);
  }
}

const promptConfig = loadPromptConfig();

/* --------------------------------------------------
 * LLM (Groq / OpenAI-compatible)
 * -------------------------------------------------- */

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

/* --------------------------------------------------
 * Axios (LinkedIn)
 * -------------------------------------------------- */

const axiosInstance = axios.create({
  timeout: 20000,
  headers: {
    Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
    "X-Restli-Protocol-Version": "2.0.0",
  },
});

/* --------------------------------------------------
 * Utils
 * -------------------------------------------------- */

function getLatestImageFromFolder(folderPath) {
  if (!fs.existsSync(folderPath)) {
    throw new Error(`Pasta de imagens não encontrada: ${folderPath}`);
  }

  const images = fs
    .readdirSync(folderPath)
    .filter((file) => /^image-\d+\.(png|jpe?g|webp)$/i.test(file))
    .sort((a, b) => {
      const na = Number(a.match(/\d+/)[0]);
      const nb = Number(b.match(/\d+/)[0]);
      return na - nb;
    });

  if (images.length === 0) {
    throw new Error("Nenhuma imagem encontrada no padrão image-X");
  }

  return path.join(folderPath, images.at(-1));
}

function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function retry(fn, retries = 3) {
  let lastError;

  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      console.warn(`⚠️ Tentativa ${i + 1}/${retries} falhou`);

      if (err.response) {
        console.error("📛 Status:", err.response.status);
        console.error(
          "📛 Resposta:",
          JSON.stringify(err.response.data, null, 2),
        );
      } else if (err.request) {
        console.error("📛 Conexão encerrada pelo LinkedIn");
      } else {
        console.error("📛 Erro:", err);
      }
    }
  }

  throw lastError;
}

/* --------------------------------------------------
 * Prompt Builders
 * -------------------------------------------------- */

function buildSystemPrompt(cfg) {
  return `
Você é um desenvolvedor experiente que escreve posts técnicos para o LinkedIn.

Idioma: ${cfg.language}
Público-alvo: ${cfg.audience}
Tom: ${cfg.tone}
Nível técnico: ${cfg.technicalDepth}

Regras:
- Nada de buzzword
- Nada inventado
- Hashtags no final
`.trim();
}

function buildUserPrompt(cfg, diff) {
  return `
Explique as alterações técnicas com foco em ${cfg.focusAreas.join(", ")}.

Diff do código:
${diff.slice(0, 2000)}
`.trim();
}

/* --------------------------------------------------
 * IA – gerar post
 * -------------------------------------------------- */

async function generatePostFromDiff(diff) {
  const completion = await groq.chat.completions.create({
    model: promptConfig.model,
    temperature: promptConfig.temperature,
    max_tokens: promptConfig.maxTokens,
    messages: [
      { role: "system", content: buildSystemPrompt(promptConfig) },
      { role: "user", content: buildUserPrompt(promptConfig, diff) },
    ],
  });

  return completion.choices[0].message.content.trim();
}

/* --------------------------------------------------
 * LinkedIn API
 * -------------------------------------------------- */

async function getPersonUrn() {
  const res = await retry(() => axiosInstance.get(`${LINKEDIN_API}/userinfo`));

  return `urn:li:person:${res.data.sub}`;
}

async function uploadImage(personUrn, imagePath) {
  const registerRes = await retry(() =>
    axiosInstance.post(`${LINKEDIN_API}/assets?action=registerUpload`, {
      registerUploadRequest: {
        owner: personUrn,
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        serviceRelationships: [
          {
            relationshipType: "OWNER",
            identifier: "urn:li:userGeneratedContent",
          },
        ],
      },
    }),
  );

  const uploadData =
    registerRes.data.value.uploadMechanism[
      "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
    ];

  const assetUrn = registerRes.data.value.asset;

  const form = new FormData();
  form.append("file", fs.createReadStream(imagePath));

  await axios.post(uploadData.uploadUrl, form, {
    headers: form.getHeaders(),
    maxBodyLength: Infinity,
  });

  return assetUrn;
}

async function createPostWithImage(personUrn, text, assetUrn) {
  return retry(() =>
    axiosInstance.post(`${LINKEDIN_API}/ugcPosts`, {
      author: personUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: "IMAGE",
          media: [{ status: "READY", media: assetUrn }],
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    }),
  );
}

async function createTextOnlyPost(personUrn, text) {
  return retry(() =>
    axiosInstance.post(`${LINKEDIN_API}/ugcPosts`, {
      author: personUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    }),
  );
}

/* --------------------------------------------------
 * Main
 * -------------------------------------------------- */

async function run() {
  const diff = execSync("git diff --cached").toString();

  if (!diff.trim()) {
    console.log("⚠️ Nenhuma alteração no stage.");
    return;
  }

  console.log("🤖 Gerando post com IA...");
  const postText = await generatePostFromDiff(diff);

  console.log("\n--- 📝 PRÉ-VISUALIZAÇÃO ---\n");
  console.log(postText);
  console.log("\n--------------------------\n");

  const imagePath = getLatestImageFromFolder(IMAGES_DIR);
  console.log("🖼 Imagem:", imagePath);

  if (promptConfig.requireConfirmation && !promptConfig.autoPublish) {
    const answer = await askConfirmation(
      "\n👉 Deseja publicar no LinkedIn? (y/n): ",
    );

    if (!["y", "yes"].includes(answer)) {
      console.log("❌ Cancelado.");
      return;
    }
  }

  if (promptConfig.dryRun) {
    console.log("🧪 Dry-run ativo.");
    return;
  }

  console.log("🚀 Publicando...");

  const personUrn = await getPersonUrn();

  try {
    const assetUrn = await uploadImage(personUrn, imagePath);
    await createPostWithImage(personUrn, postText, assetUrn);
    console.log("✅ Post publicado com imagem!");
  } catch (err) {
    console.warn("⚠️ Falha ao publicar com imagem. Fallback para texto...");
    await createTextOnlyPost(personUrn, postText);
    console.log("✅ Post publicado SOMENTE com texto.");
  }
}

run().catch((err) => {
  console.error("🔥 Erro fatal:", err);
  process.exit(1);
});
