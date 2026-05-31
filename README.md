# Mesa Viva

Recetario visual para guardar comidas con foto, ingredientes, preparacion y busqueda inteligente por despensa.

## Funciones

- Alta de recetas con foto.
- Lectura opcional de imagen con OpenAI Vision.
- Ingredientes estructurados por receta.
- Busqueda por nombre, ingrediente, cocina, categoria o etiqueta.
- Vista de receta con foto, ingredientes y pasos.
- Despensa inteligente: escribe ingredientes disponibles y la app recomienda recetas por porcentaje de coincidencia.
- Despensa guardada: registra lo que tienes, recibe recomendaciones y descuenta ingredientes cuando cocinas.
- Carga de recetas por lote con previsualizacion antes de guardar.
- Edicion y eliminacion de recetas.
- Lista para Railway + MySQL.

## Formato de ingredientes

En el formulario, cada ingrediente va en un renglon:

```text
ingrediente, cantidad, unidad
```

Ejemplo:

```text
pollo, 2, piezas
arroz, 1, taza
limon, 1, pieza
```

## Carga por lote

En `/recetas/lote`, el layout deja instrucciones arriba. La app ignora los primeros 4 renglones y lee recetas desde el renglon 5.

```text
Renglon 1: titulo del layout
Renglon 2: nota
Renglon 3: Las recetas empiezan en el renglon 5.
Renglon 4: encabezados
Renglon 5: primera receta
```

Cada ingrediente usa tres columnas propias: ingrediente, cantidad y unidad. Puedes llenar hasta 10 ingredientes por receta.

```text
nombre,categoria,cocina,minutos,porciones,ingrediente 1,cantidad 1,unidad 1,ingrediente 2,cantidad 2,unidad 2,...
"Tacos de pollo","cena","mexicana","25","2","pollo","2","piezas","tortilla","6","piezas"
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
