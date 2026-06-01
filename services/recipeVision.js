function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);

  if (!match) {
    throw new Error("La imagen no tiene un formato valido.");
  }

  return {
    mime: match[1],
    buffer: Buffer.from(match[2], "base64")
  };
}

function emptyAnalysis() {
  return {
    title: "",
    subtitle: "",
    category: "",
    cuisine: "",
    mood: "",
    ingredients: [],
    instructions: "",
    extracted_text: ""
  };
}

function normalizeAnalysis(analysis) {
  return {
    ...emptyAnalysis(),
    ...analysis,
    ingredients: Array.isArray(analysis?.ingredients) ? analysis.ingredients : []
  };
}

function getVisionModel() {
  return process.env.OPENAI_MODEL || "gpt-4.1-mini";
}

function findOutputText(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(findOutputText).filter(Boolean).join("\n");
  }

  if (typeof value === "object") {
    if (value.type === "output_text" && value.text) {
      return value.text;
    }

    return Object.values(value).map(findOutputText).filter(Boolean).join("\n");
  }

  return "";
}

function parseJsonLoose(text) {
  const clean = String(text || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(clean);
  } catch (error) {
    const match = clean.match(/\{[\s\S]*\}/);

    if (match) {
      return JSON.parse(match[0]);
    }

    throw error;
  }
}

function parseOpenAIError(detail) {
  try {
    const parsed = JSON.parse(detail);
    const error = parsed.error || {};

    if (error.code === "insufficient_quota" || error.type === "insufficient_quota") {
      return "OpenAI rechazo la lectura por cuota insuficiente de API.";
    }

    if (error.message) {
      return `OpenAI respondio: ${error.message}`;
    }
  } catch (error) {
    return detail;
  }

  return detail;
}

async function analyzeRecipeImage(dataUrl) {
  if (!process.env.OPENAI_API_KEY) {
    return emptyAnalysis();
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: getVisionModel(),
      text: {
        format: {
          type: "json_object"
        }
      },
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Analiza la foto de una comida, receta escrita, menu o platillo. Devuelve solo JSON valido con llaves: title, subtitle, category, cuisine, mood, ingredients, instructions, extracted_text. ingredients debe ser un arreglo de objetos con name, quantity, unit, section, is_optional. Usa solo lo visible o inferencias culinarias obvias; no inventes una receta completa si no hay suficiente informacion."
            },
            {
              type: "input_image",
              image_url: dataUrl
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(parseOpenAIError(detail));
  }

  const payload = await response.json();
  const outputText = findOutputText(payload);

  try {
    const parsed = parseJsonLoose(outputText);
    return normalizeAnalysis({
      ...parsed,
      extracted_text: parsed.extracted_text || outputText
    });
  } catch (error) {
    return normalizeAnalysis({ extracted_text: outputText });
  }
}

module.exports = {
  analyzeRecipeImage,
  parseDataUrl
};
