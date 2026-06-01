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

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(cleanText(current));
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(cleanText(current));
  return cells;
}

function splitBatchRows(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd());
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
      section: "",
      is_optional: false
    })).filter((item) => item.name);
  }

  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.includes("|") ? line.split("|").map(cleanText) : line.split(",").map(cleanText))
    .map((parts) => ({
      name: parts[0],
      quantity: parts[1] || "",
      unit: parts[2] || "",
      section: "",
      is_optional: false
    }))
    .filter((item) => item.name);
}

function ingredientsToText(ingredients) {
  return ingredients
    .map((item) => [item.name, item.quantity, item.unit].filter(Boolean).join(", "))
    .join("\n");
}

function formatIngredientLine(item) {
  return [item.name, item.quantity, item.unit].filter(Boolean).join(" ");
}

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function normalizeIds(value) {
  return []
    .concat(value || [])
    .map((item) => Number.parseInt(item, 10))
    .filter((item) => Number.isFinite(item) && item > 0);
}

function mergeIngredientGroups(items) {
  const groups = new Map();

  for (const item of items) {
    const key = `${normalizeIngredientName(item.name)}|${cleanText(item.unit).toLowerCase()}`;

    if (!groups.has(key)) {
      groups.set(key, {
        name: cleanText(item.name),
        quantity: cleanText(item.quantity),
        unit: cleanText(item.unit),
        bought: Boolean(item.bought)
      });
      continue;
    }

    const current = groups.get(key);
    const currentQuantity = Number.parseFloat(current.quantity);
    const nextQuantity = Number.parseFloat(item.quantity);

    if (Number.isFinite(currentQuantity) && Number.isFinite(nextQuantity) && current.unit === cleanText(item.unit)) {
      current.quantity = String(currentQuantity + nextQuantity);
    } else if (item.quantity && !String(current.quantity).includes(item.quantity)) {
      current.quantity = [current.quantity, item.quantity].filter(Boolean).join(" + ");
    }
  }

  return Array.from(groups.values());
}

function parseRecipeBatch(value) {
  const rows = splitBatchRows(value).slice(4).filter((line) => cleanText(line));
  const recipes = [];
  const errors = [];

  rows.forEach((row, index) => {
    const columns = parseCsvLine(row);

    const [
      title,
      category,
      cuisine,
      prepMinutes,
      servings,
      ingredient1,
      quantity1,
      unit1,
      ingredient2,
      quantity2,
      unit2,
      ingredient3,
      quantity3,
      unit3,
      ingredient4,
      quantity4,
      unit4,
      ingredient5,
      quantity5,
      unit5,
      ingredient6,
      quantity6,
      unit6,
      ingredient7,
      quantity7,
      unit7,
      ingredient8,
      quantity8,
      unit8,
      ingredient9,
      quantity9,
      unit9,
      ingredient10,
      quantity10,
      unit10,
      instructions,
      tags,
      subtitle
    ] = columns;

    if (!title) {
      errors.push(`Renglon ${index + 5}: falta el nombre.`);
      return;
    }

    const ingredientColumns = [
      [ingredient1, quantity1, unit1],
      [ingredient2, quantity2, unit2],
      [ingredient3, quantity3, unit3],
      [ingredient4, quantity4, unit4],
      [ingredient5, quantity5, unit5],
      [ingredient6, quantity6, unit6],
      [ingredient7, quantity7, unit7],
      [ingredient8, quantity8, unit8],
      [ingredient9, quantity9, unit9],
      [ingredient10, quantity10, unit10]
    ];
    const parsedIngredients = ingredientColumns
      .map(([name, quantity, unit]) => ({
        name: cleanText(name),
        quantity: cleanText(quantity),
        unit: cleanText(unit),
        section: "",
        is_optional: false
      }))
      .filter((item) => item.name);

    if (!parsedIngredients.length) {
      errors.push(`Renglon ${index + 5}: falta al menos un ingrediente.`);
    }

    recipes.push({
      rowNumber: index + 5,
      title: cleanText(title),
      subtitle: cleanText(subtitle),
      category: cleanText(category),
      cuisine: cleanText(cuisine),
      difficulty: "facil",
      prep_minutes: numberOrDefault(prepMinutes, 30),
      servings: numberOrDefault(servings, 2),
      mood: "",
      notes: "",
      instructions: cleanText(instructions),
      extracted_text: "",
      tags: cleanText(tags),
      ingredients: parsedIngredients,
      ingredients_text: ingredientsToText(parsedIngredients)
    });
  });

  return { recipes, errors };
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

async function createRecipesBatch(rawBatch) {
  const parsed = parseRecipeBatch(rawBatch);

  if (parsed.errors.length) {
    return {
      ...parsed,
      created: 0
    };
  }

  for (const recipe of parsed.recipes) {
    await createRecipe({
      ...recipe,
      ingredients: recipe.ingredients_text
    });
  }

  return {
    ...parsed,
    created: parsed.recipes.length
  };
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
    .map((item) => [item.name, item.quantity, item.unit].filter(Boolean).join(", "))
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
      recipes.updated_at,
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
      recipes.created_at,
      recipes.updated_at
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
      const ingredients = fullRecipe.ingredients;
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

async function getPantryItems() {
  const [items] = await pool.query("SELECT * FROM pantry_items ORDER BY name ASC, id ASC");
  return items;
}

async function addPantryItems(rawItems) {
  const items = parseIngredients(rawItems);

  if (!items.length) {
    return;
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    for (const item of items) {
      await connection.query(
        "INSERT INTO pantry_items (name, quantity, unit) VALUES (?, ?, ?)",
        [item.name, item.quantity, item.unit]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function addPantryItem(item) {
  const name = cleanText(item.name);

  if (!name) {
    return;
  }

  await pool.query(
    "INSERT INTO pantry_items (name, quantity, unit) VALUES (?, ?, ?)",
    [name, cleanText(item.quantity), cleanText(item.unit)]
  );
}

async function deletePantryItem(id) {
  await pool.query("DELETE FROM pantry_items WHERE id = ?", [id]);
}

async function recommendFromPantry() {
  const items = await getPantryItems();
  const ingredientNames = items.map((item) => item.name).join(", ");
  return recommendByIngredients(ingredientNames);
}

async function eatRecipe(recipeId) {
  const recipe = await getRecipe(recipeId);

  if (!recipe) {
    throw new Error("Receta no encontrada.");
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    for (const ingredient of recipe.ingredients) {
      const normalized = normalizeIngredientName(ingredient.name);
      const [items] = await connection.query("SELECT id, name FROM pantry_items ORDER BY id ASC");
      const match = items.find((item) => ingredientMatches(normalizeIngredientName(item.name), normalized));

      if (match) {
        await connection.query("DELETE FROM pantry_items WHERE id = ? LIMIT 1", [match.id]);
      }
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function buildChefPlanPreview(recipeIds) {
  const ids = normalizeIds(recipeIds);
  const pantryItems = await getPantryItems();
  const recipes = (await Promise.all(ids.map((id) => getRecipe(id)))).filter(Boolean);
  const available = [];
  const missing = [];

  for (const recipe of recipes) {
    for (const ingredient of recipe.ingredients) {
      const normalized = normalizeIngredientName(ingredient.name);
      const pantryMatch = pantryItems.find((item) => (
        ingredientMatches(normalizeIngredientName(item.name), normalized)
      ));

      if (pantryMatch) {
        available.push({
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          recipe: recipe.title
        });
      } else {
        missing.push({
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          recipe: recipe.title,
          bought: false
        });
      }
    }
  }

  return {
    recipes,
    recipeNames: recipes.map((recipe) => recipe.title),
    pantryItems: mergeIngredientGroups(available),
    shoppingItems: mergeIngredientGroups(missing)
  };
}

async function createChefPlan(recipeIds) {
  const preview = await buildChefPlanPreview(recipeIds);

  if (!preview.recipes.length) {
    throw new Error("Selecciona al menos una receta para crear el plan.");
  }

  const [result] = await pool.query(
    `
      INSERT INTO chef_plans (recipe_names_json, pantry_items_json, shopping_items_json)
      VALUES (?, ?, ?)
    `,
    [
      JSON.stringify(preview.recipeNames),
      JSON.stringify(preview.pantryItems),
      JSON.stringify(preview.shoppingItems)
    ]
  );

  return result.insertId;
}

async function getChefPlan(id) {
  const [rows] = await pool.query("SELECT * FROM chef_plans WHERE id = ? LIMIT 1", [id]);
  const plan = rows[0];

  if (!plan) {
    return null;
  }

  plan.recipeNames = parseJsonArray(plan.recipe_names_json);
  plan.pantryItems = parseJsonArray(plan.pantry_items_json);
  plan.shoppingItems = parseJsonArray(plan.shopping_items_json);
  plan.copyText = [
    `Plan del chef: ${plan.recipeNames.join(", ")}`,
    "",
    "Comprar:",
    ...plan.shoppingItems.filter((item) => !item.bought).map((item) => `- ${formatIngredientLine(item)}`)
  ].join("\n");

  return plan;
}

async function markChefPlanItemBought(planId, itemIndex) {
  const plan = await getChefPlan(planId);

  if (!plan) {
    throw new Error("Plan no encontrado.");
  }

  const index = Number.parseInt(itemIndex, 10);
  const item = plan.shoppingItems[index];

  if (!item) {
    throw new Error("Ingrediente no encontrado.");
  }

  if (!item.bought) {
    item.bought = true;
    await addPantryItem(item);
    await pool.query(
      "UPDATE chef_plans SET shopping_items_json = ? WHERE id = ?",
      [JSON.stringify(plan.shoppingItems), planId]
    );
  }
}

module.exports = {
  addPantryItems,
  buildChefPlanPreview,
  createRecipe,
  createRecipesBatch,
  createChefPlan,
  deleteRecipe,
  deletePantryItem,
  eatRecipe,
  getChefPlan,
  getDashboard,
  getPantryItems,
  getRecipe,
  getRecipeImage,
  recommendFromPantry,
  recommendByIngredients,
  parseRecipeBatch,
  markChefPlanItemBought,
  searchRecipes,
  updateRecipe,
  updateRecipePhoto
};
