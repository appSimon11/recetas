CREATE TABLE IF NOT EXISTS recipes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(180) NOT NULL,
  subtitle VARCHAR(220) NOT NULL DEFAULT '',
  category VARCHAR(120) NOT NULL DEFAULT '',
  cuisine VARCHAR(120) NOT NULL DEFAULT '',
  difficulty ENUM('facil', 'media', 'especial') NOT NULL DEFAULT 'facil',
  prep_minutes INT NOT NULL DEFAULT 30,
  servings INT NOT NULL DEFAULT 2,
  mood VARCHAR(120) NOT NULL DEFAULT '',
  notes TEXT NULL,
  instructions TEXT NULL,
  image_mime VARCHAR(80) NULL,
  image_data LONGBLOB NULL,
  extracted_text TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FULLTEXT KEY recipes_search_fulltext (
    title,
    subtitle,
    category,
    cuisine,
    mood,
    notes,
    instructions,
    extracted_text
  )
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  recipe_id INT UNSIGNED NOT NULL,
  name VARCHAR(160) NOT NULL,
  quantity VARCHAR(80) NOT NULL DEFAULT '',
  unit VARCHAR(80) NOT NULL DEFAULT '',
  section VARCHAR(120) NOT NULL DEFAULT '',
  is_optional BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY recipe_ingredients_recipe_index (recipe_id),
  KEY recipe_ingredients_name_index (name),
  CONSTRAINT recipe_ingredients_recipe_fk
    FOREIGN KEY (recipe_id)
    REFERENCES recipes(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recipe_tags (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  recipe_id INT UNSIGNED NOT NULL,
  tag VARCHAR(80) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY recipe_tag_unique (recipe_id, tag),
  KEY recipe_tags_tag_index (tag),
  CONSTRAINT recipe_tags_recipe_fk
    FOREIGN KEY (recipe_id)
    REFERENCES recipes(id)
    ON DELETE CASCADE
);
