const { pool } = require("../db/connection");
const { parseDataUrl } = require("./recipeVision");

function cleanText(value) {
  return String(value || "").trim();
}

function numberOrDefault(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseList(value) {
  return String(value || "")
    .split(/\r?\n|,/)
    .map(cleanText)
    .filter(Boolean);
}

function normalizeIngredientName(value) {
  return cleanText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(el|la|los|las|un|una|de|del|en)\b/g, "")
    .replace(/[^a-z0-9ñ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ingredientMatches(pantryItem, ingredient) {
  if (pantryItem === ingredient) {
    return true;
  }

  const pantryWords = pantryItem.split(" ").filter(Boolean);
  const ingredientWords = ingredient.split(" ").filter(Boolean);

  return pantryWords.some((word) => ingredientWords.includes(word));
}

function parseIngredients(value) {
  if (Array.isArray(value)) {
    return value.map((item) => ({
      name: cleanText(item.name),
      quantity: cleanText(item.quantity),
      unit: cleanText(item.unit),
      section: cleanText(item.section),
      is_optional: Boolean(item.is_optional)
    })).filter((item) => item.name);
  }

  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.split("|").map(cleanText))
    .map((parts) => ({
      name: parts[0],
      quantity: parts[1] || "",
      unit: parts[2] || "",
      section: parts[3] || "",
      is_optional: ["si", "true", "opcional"].includes((parts[4] || "").toLowerCase())
    }))
    .filter((item) => item.name);
}

function normalizeRecipe(data) {
  return {
    title: cleanText(data.title),
    subtitle: cleanText(data.subtitle),
    category: cleanText(data.category),
    cuisine: cleanText(data.cuisine),
    difficulty: cleanText(data.difficulty) || "facil",
    prep_minutes: numberOrDefault(data.prep_minutes, 30),
    servings: numberOrDefault(data.servings, 2),
    mood: cleanText(data.mood),
    notes: cleanText(data.notes),
    instructions: cleanText(data.instructions),
    extracted_text: cleanText(data.extracted_text),
    tags: parseList(data.tags),
    ingredients: parseIngredients(data.ingredients)
  };
}

function parseOptionalImage(dataUrl) {
  if (!cleanText(dataUrl)) {
    return { mime: null, buffer: null };
  }

  return parseDataUrl(dataUrl);
}

async function saveRecipeParts(connection, recipeId, recipe) {
  await connection.query("DELETE FROM recipe_ingredients WHERE recipe_id = ?", [recipeId]);
  await connection.query("DELETE FROM recipe_tags WHERE recipe_id = ?", [recipeId]);

  for (const ingredient of recipe.ingredients) {
    await connection.query(
      `
        INSERT INTO recipe_ingredients (recipe_id, name, quantity, unit, section, is_optional)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        recipeId,
        ingredient.name,
        ingredient.quantity,
        ingredient.unit,
        ingredient.section,
        ingredient.is_optional ? 1 : 0
      ]
    );
  }

  for (const tag of recipe.tags) {
    await connection.query(
      "INSERT IGNORE INTO recipe_tags (recipe_id, tag) VALUES (?, ?)",
      [recipeId, tag]
    );
  }
}

async function createRecipe(data) {
  const recipe = normalizeRecipe(data);
  const image = parseOptionalImage(data.image_data_url);

  if (!recipe.title) {
    throw new Error("Indica el nombre de la receta.");
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `
        INSERT INTO recipes (
          title, subtitle, category, cuisine, difficulty, prep_minutes, servings,
          mood, notes, instructions, image_mime, image_data, extracted_text
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        recipe.title,
        recipe.subtitle,
        recipe.category,
        recipe.cuisine,
        recipe.difficulty,
        recipe.prep_minutes,
        recipe.servings,
        recipe.mood,
        recipe.notes,
        recipe.instructions,
        image.mime,
        image.buffer,
        recipe.extracted_text
      ]
    );

    await saveRecipeParts(connection, result.insertId, recipe);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateRecipe(id, data) {
  const recipe = normalizeRecipe(data);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      `
        UPDATE recipes
        SET title = ?, subtitle = ?, category = ?, cuisine = ?, difficulty = ?,
          prep_minutes = ?, servings = ?, mood = ?, notes = ?, instructions = ?,
          extracted_text = ?
        WHERE id = ?
      `,
      [
        recipe.title,
        recipe.subtitle,
        recipe.category,
        recipe.cuisine,
        recipe.difficulty,
        recipe.prep_minutes,
        recipe.servings,
        recipe.mood,
        recipe.notes,
        recipe.instructions,
        recipe.extracted_text,
        id
      ]
    );

    await saveRecipeParts(connection, id, recipe);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateRecipePhoto(id, dataUrl) {
  const image = parseDataUrl(dataUrl);
  await pool.query("UPDATE recipes SET image_mime = ?, image_data = ? WHERE id = ?", [
    image.mime,
    image.buffer,
    id
  ]);
}

async function deleteRecipe(id) {
  await pool.query("DELETE FROM recipes WHERE id = ?", [id]);
}

async function getRecipe(id) {
  const [rows] = await pool.query("SELECT * FROM recipes WHERE id = ? LIMIT 1", [id]);
  const recipe = rows[0];

  if (!recipe) {
    return recipe;
  }

  const [ingredients] = await pool.query(
    "SELECT * FROM recipe_ingredients WHERE recipe_id = ? ORDER BY id ASC",
    [id]
  );
  const [tags] = await pool.query("SELECT tag FROM recipe_tags WHERE recipe_id = ? ORDER BY tag ASC", [id]);

  recipe.ingredients = ingredients;
  recipe.tags = tags.map((item) => item.tag);
  recipe.ingredients_text = ingredients
    .map((item) => [item.name, item.quantity, item.unit, item.section, item.is_optional ? "opcional" : ""].join(" | "))
    .join("\n");
  recipe.tags_text = recipe.tags.join(", ");

  return recipe;
}

async function getRecipeImage(id) {
  const [rows] = await pool.query("SELECT image_mime, image_data FROM recipes WHERE id = ? LIMIT 1", [id]);
  return rows[0];
}

function recipeSelectQuery(where = "") {
  return `
    SELECT
      recipes.id,
      recipes.title,
      recipes.subtitle,
      recipes.category,
      recipes.cuisine,
      recipes.difficulty,
      recipes.prep_minutes,
      recipes.servings,
      recipes.mood,
      recipes.created_at,
      GROUP_CONCAT(DISTINCT recipe_ingredients.name ORDER BY recipe_ingredients.name SEPARATOR ', ') AS ingredient_summary,
      GROUP_CONCAT(DISTINCT recipe_tags.tag ORDER BY recipe_tags.tag SEPARATOR ', ') AS tag_summary
    FROM recipes
    LEFT JOIN recipe_ingredients ON recipe_ingredients.recipe_id = recipes.id
    LEFT JOIN recipe_tags ON recipe_tags.recipe_id = recipes.id
    ${where}
    GROUP BY
      recipes.id,
      recipes.title,
      recipes.subtitle,
      recipes.category,
      recipes.cuisine,
      recipes.difficulty,
      recipes.prep_minutes,
      recipes.servings,
      recipes.mood,
      recipes.created_at
    ORDER BY recipes.created_at DESC
    LIMIT 120
  `;
}

async function searchRecipes(query = "") {
  const search = cleanText(query);

  if (!search) {
    const [rows] = await pool.query(recipeSelectQuery());
    return rows;
  }

  const like = `%${search}%`;
  const [rows] = await pool.query(
    recipeSelectQuery(`
      WHERE
        recipes.title LIKE ?
        OR recipes.subtitle LIKE ?
        OR recipes.category LIKE ?
        OR recipes.cuisine LIKE ?
        OR recipes.mood LIKE ?
        OR recipes.notes LIKE ?
        OR recipes.instructions LIKE ?
        OR recipe_ingredients.name LIKE ?
        OR recipe_tags.tag LIKE ?
    `),
    [like, like, like, like, like, like, like, like, like]
  );

  return rows;
}

async function getDashboard() {
  const [[summary]] = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM recipes) AS recipe_count,
      (SELECT COUNT(*) FROM recipe_ingredients) AS ingredient_count,
      (SELECT COUNT(DISTINCT cuisine) FROM recipes WHERE cuisine <> '') AS cuisine_count
  `);

  const recent = await searchRecipes();
  const [tags] = await pool.query(`
    SELECT tag, COUNT(*) AS total
    FROM recipe_tags
    GROUP BY tag
    ORDER BY total DESC, tag ASC
    LIMIT 12
  `);

  return {
    summary,
    recent: recent.slice(0, 6),
    tags
  };
}

async function recommendByIngredients(rawIngredients) {
  const pantry = parseList(rawIngredients).map(normalizeIngredientName).filter(Boolean);
  const recipes = await searchRecipes();

  if (!pantry.length) {
    return [];
  }

  const enriched = await Promise.all(
    recipes.map(async (recipe) => {
      const fullRecipe = await getRecipe(recipe.id);
      const ingredients = fullRecipe.ingredients.filter((item) => !item.is_optional);
      const optional = fullRecipe.ingredients.filter((item) => item.is_optional);
      const hits = [];
      const missing = [];

      for (const ingredient of ingredients) {
        const normalized = normalizeIngredientName(ingredient.name);
        const matched = pantry.some((item) => ingredientMatches(item, normalized));

        if (matched) {
          hits.push(ingredient.name);
        } else {
          missing.push(ingredient.name);
        }
      }

      const total = ingredients.length || 1;
      const score = Math.round((hits.length / total) * 100);
      const convenience = score === 100 ? "lista para hacer" : missing.length <= 2 ? "casi lista" : "para planear";

      return {
        ...recipe,
        hits,
        missing,
        optional: optional.map((item) => item.name),
        score,
        convenience
      };
    })
  );

  return enriched
    .filter((recipe) => recipe.hits.length)
    .sort((a, b) => b.score - a.score || a.missing.length - b.missing.length || a.prep_minutes - b.prep_minutes)
    .slice(0, 20);
}

module.exports = {
  createRecipe,
  deleteRecipe,
  getDashboard,
  getRecipe,
  getRecipeImage,
  recommendByIngredients,
  searchRecipes,
  updateRecipe,
  updateRecipePhoto
};
