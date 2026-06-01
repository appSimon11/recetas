require("dotenv").config();

const express = require("express");
const path = require("path");
const { analyzeRecipeImage } = require("./services/recipeVision");
const {
  addPantryItems,
  buildChefPlanPreview,
  createRecipe,
  createChefPlan,
  createRecipesBatch,
  deleteRecipe,
  deletePantryItem,
  eatRecipe,
  getChefPlan,
  getDashboard,
  getPantryItems,
  getRecipe,
  getRecipeImage,
  markChefPlanItemBought,
  recommendFromPantry,
  recommendByIngredients,
  parseRecipeBatch,
  searchRecipes,
  updateRecipe,
  updateRecipePhoto
} = require("./services/recipes");

const app = express();
const port = process.env.PORT || 3000;

function redirectWithMessage(res, path, key, message) {
  res.redirect(`${path}?${key}=${encodeURIComponent(message)}`);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true, limit: "22mb" }));
app.use(express.json({ limit: "22mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.flash = req.query.flash || "";
  res.locals.error = req.query.error || "";
  next();
});

app.get("/", async (req, res, next) => {
  try {
    const dashboard = await getDashboard();
    res.render("dashboard", { title: "Cocina", dashboard });
  } catch (error) {
    next(error);
  }
});

app.get("/plan-chef", async (req, res, next) => {
  try {
    const recipes = await searchRecipes(req.query.q || "");
    const selectedIds = []
      .concat(req.query.recetas || [])
      .map((item) => Number.parseInt(item, 10))
      .filter((item) => Number.isFinite(item) && item > 0);
    const preview = selectedIds.length ? await buildChefPlanPreview(selectedIds) : null;

    res.render("chef-plan/index", {
      title: "Plan del chef",
      recipes,
      query: req.query.q || "",
      selectedIds,
      preview
    });
  } catch (error) {
    next(error);
  }
});

app.post("/plan-chef", async (req, res, next) => {
  try {
    const planId = await createChefPlan(req.body.recipes);
    redirectWithMessage(res, `/plan-chef/${planId}`, "flash", "Plan listo");
  } catch (error) {
    redirectWithMessage(res, "/plan-chef", "error", error.message);
  }
});

app.get("/plan-chef/:id", async (req, res, next) => {
  try {
    const plan = await getChefPlan(req.params.id);

    if (!plan) {
      redirectWithMessage(res, "/plan-chef", "error", "Plan no encontrado");
      return;
    }

    res.render("chef-plan/show", { title: "Plan del chef", plan });
  } catch (error) {
    next(error);
  }
});

app.get("/plan-chef/:id/super", async (req, res, next) => {
  try {
    const plan = await getChefPlan(req.params.id);

    if (!plan) {
      redirectWithMessage(res, "/plan-chef", "error", "Plan no encontrado");
      return;
    }

    res.render("chef-plan/shop", { title: "Supermercado", plan });
  } catch (error) {
    next(error);
  }
});

app.post("/plan-chef/:id/comprar/:index", async (req, res, next) => {
  try {
    await markChefPlanItemBought(req.params.id, req.params.index);
    redirectWithMessage(res, `/plan-chef/${req.params.id}/super`, "flash", "Agregado a despensa");
  } catch (error) {
    next(error);
  }
});

app.get("/recetas", async (req, res, next) => {
  try {
    const recipes = await searchRecipes(req.query.q || "");
    res.render("recipes/index", {
      title: "Recetas",
      recipes,
      query: req.query.q || ""
    });
  } catch (error) {
    next(error);
  }
});

app.get("/recetas/nueva", (req, res) => {
  res.render("recipes/form", {
    title: "Nueva receta",
    recipe: {},
    action: "/recetas"
  });
});

app.get("/recetas/lote", (req, res) => {
  res.render("recipes/batch", {
    title: "Carga por lote",
    batchText: "",
    preview: null,
    errors: []
  });
});

app.post("/recetas/lote/preview", (req, res) => {
  const batchText = req.body.batch_text || "";
  const preview = parseRecipeBatch(batchText);

  res.render("recipes/batch", {
    title: "Carga por lote",
    batchText,
    preview: preview.recipes,
    errors: preview.errors
  });
});

app.post("/recetas/lote", async (req, res, next) => {
  try {
    const result = await createRecipesBatch(req.body.batch_text || "");

    if (result.errors.length) {
      res.status(422).render("recipes/batch", {
        title: "Carga por lote",
        batchText: req.body.batch_text || "",
        preview: result.recipes,
        errors: result.errors
      });
      return;
    }

    redirectWithMessage(res, "/recetas", "flash", `${result.created} recetas cargadas`);
  } catch (error) {
    next(error);
  }
});

app.post("/recetas/analizar", async (req, res) => {
  try {
    const imageDataUrl = req.body.image_data_url || "";
    const analysis = await analyzeRecipeImage(imageDataUrl);
    res.json({ analysis });
  } catch (error) {
    res.status(422).json({ message: error.message });
  }
});

app.post("/recetas", async (req, res, next) => {
  try {
    await createRecipe(req.body);
    redirectWithMessage(res, "/recetas", "flash", "Receta guardada");
  } catch (error) {
    next(error);
  }
});

app.get("/recetas/:id", async (req, res, next) => {
  try {
    const recipe = await getRecipe(req.params.id);

    if (!recipe) {
      redirectWithMessage(res, "/recetas", "error", "Receta no encontrada");
      return;
    }

    res.render("recipes/show", { title: recipe.title, recipe });
  } catch (error) {
    next(error);
  }
});

app.get("/recetas/:id/editar", async (req, res, next) => {
  try {
    const recipe = await getRecipe(req.params.id);

    if (!recipe) {
      redirectWithMessage(res, "/recetas", "error", "Receta no encontrada");
      return;
    }

    res.render("recipes/form", {
      title: "Editar receta",
      recipe,
      action: `/recetas/${recipe.id}`
    });
  } catch (error) {
    next(error);
  }
});

app.post("/recetas/:id", async (req, res, next) => {
  try {
    await updateRecipe(req.params.id, req.body);
    redirectWithMessage(res, `/recetas/${req.params.id}`, "flash", "Receta actualizada");
  } catch (error) {
    next(error);
  }
});

app.post("/recetas/:id/foto", async (req, res, next) => {
  try {
    await updateRecipePhoto(req.params.id, req.body.image_data_url);
    redirectWithMessage(res, `/recetas/${req.params.id}/editar`, "flash", "Foto actualizada");
  } catch (error) {
    next(error);
  }
});

app.post("/recetas/:id/eliminar", async (req, res, next) => {
  try {
    await deleteRecipe(req.params.id);
    redirectWithMessage(res, "/recetas", "flash", "Receta eliminada");
  } catch (error) {
    next(error);
  }
});

app.get("/recetas/:id/imagen", async (req, res, next) => {
  try {
    const image = await getRecipeImage(req.params.id);

    if (!image || !image.image_data) {
      res.set("Content-Type", "image/svg+xml");
      res.send(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop stop-color="#f4eadf"/>
              <stop offset="1" stop-color="#d9ead7"/>
            </linearGradient>
          </defs>
          <rect width="800" height="600" fill="url(#g)"/>
          <circle cx="400" cy="270" r="116" fill="#ffffff" opacity=".7"/>
          <path d="M315 305c54 44 122 44 170 0" fill="none" stroke="#6c7a55" stroke-width="16" stroke-linecap="round"/>
          <text x="400" y="445" text-anchor="middle" font-family="Arial" font-size="38" fill="#536047">Sin foto</text>
        </svg>
      `);
      return;
    }

    res.set("Content-Type", image.image_mime);
    res.set("Cache-Control", "no-store");
    res.send(image.image_data);
  } catch (error) {
    next(error);
  }
});

app.get("/despensa", async (req, res, next) => {
  try {
    const ingredients = req.query.ingredientes || "";
    const pantryItems = await getPantryItems();
    const recommendations = ingredients ? await recommendByIngredients(ingredients) : [];
    const pantryRecommendations = await recommendFromPantry();

    res.render("pantry", {
      title: "Despensa",
      ingredients,
      pantryItems,
      recommendations,
      pantryRecommendations
    });
  } catch (error) {
    next(error);
  }
});

app.post("/despensa", async (req, res, next) => {
  try {
    await addPantryItems(req.body.items || "");
    redirectWithMessage(res, "/despensa", "flash", "Despensa actualizada");
  } catch (error) {
    next(error);
  }
});

app.post("/despensa/:id/eliminar", async (req, res, next) => {
  try {
    await deletePantryItem(req.params.id);
    redirectWithMessage(res, "/despensa", "flash", "Ingrediente eliminado");
  } catch (error) {
    next(error);
  }
});

app.post("/despensa/recetas/:id/comer", async (req, res, next) => {
  try {
    await eatRecipe(req.params.id);
    redirectWithMessage(res, "/despensa", "flash", "Buen provecho. Quite esos ingredientes de la despensa.");
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).render("error", {
    title: "Algo salio mal",
    message: error.message || "No se pudo completar la operacion."
  });
});

app.listen(port, () => {
  console.log(`Recetario listo en http://localhost:${port}`);
});
