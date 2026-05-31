# Mesa Viva

Recetario visual para guardar comidas con foto, ingredientes, preparacion y busqueda inteligente por despensa.

## Funciones

- Alta de recetas con foto.
- Lectura opcional de imagen con OpenAI Vision.
- Ingredientes estructurados por receta.
- Busqueda por nombre, ingrediente, cocina, categoria o etiqueta.
- Vista de receta con foto, ingredientes y pasos.
- Despensa inteligente: escribe ingredientes disponibles y la app recomienda recetas por porcentaje de coincidencia.
- Edicion y eliminacion de recetas.
- Lista para Railway + MySQL.

## Formato de ingredientes

En el formulario, cada ingrediente va en un renglon:

```text
ingrediente | cantidad | unidad | seccion | opcional
```

Ejemplo:

```text
pollo | 2 | piezas | proteina
arroz | 1 | taza | base
limon | 1 | pieza | final | opcional
```

## Configuracion local

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```

## Railway

Configura:

```text
DATABASE_URL=${{MySQL.MYSQL_URL}}
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4.1-mini
```

`OPENAI_API_KEY` es opcional. Sin llave, la app funciona manualmente; solo no lee fotos automaticamente.
