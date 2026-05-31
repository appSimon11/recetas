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

En `/recetas/lote`, cada receta va en un renglon con columnas separadas por comas:

```text
nombre,categoria,cocina,minutos,porciones,ingredientes,preparacion,etiquetas,subtitulo
```

Si una columna tiene comas internas, ponla entre comillas. En ingredientes, separa cada ingrediente con punto y coma:

```text
"Tacos de pollo","cena","mexicana","25","2","pollo, 2, piezas; tortilla, 6, piezas; salsa, 1, taza","Calienta el pollo y arma los tacos.","rapida, pollo","Tacos faciles"
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
