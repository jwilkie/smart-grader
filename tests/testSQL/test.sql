-- DEVOIR 4
-- Stephanie Brouillard
-- 2665932
-- 16 novement 2018

-- 1
SELECT em.nom, em.description
FROM elements_menu em
INNER JOIN details_commande dc ON em.id = dc.id_elements_menu
INNER JOIN commandes c ON c.id = dc.id_commandes
WHERE code_table IN ('D3')
GROUP BY em.id;

-- 2
SELECT em.nom, em.description
FROM elements_menu em
INNER JOIN elements_menu_ingredient emi ON emi.id_elements_menu = em.id
INNER JOIN ingredient i ON i.id = emi.id_ingredient
WHERE i.nom = 'Tomate'
GROUP BY em.id;

-- 3
SELECT COUNT(*), em.nom
FROM elements_menu em
INNER JOIN elements_menu_ingredient emi ON emi.id_elements_menu = em.id
GROUP BY id_ingredient;

-- 4
SELECT DISTINCT em.nom, em.description
FROM elements_menu em
INNER JOIN details_commande dc ON dc.id_elements_menu = em.id
INNER JOIN commandes c ON c.id = dc.id_commandes
INNER JOIN elements_menu_ingredient emi ON emi.id_elements_menu = em.id
INNER JOIN ingredient i ON i.id = emi.id_ingredient
WHERE code_table IN ('A1') OR i.nom IN ('Beurre');

-- 5
SELECT em.nom, em.description, COUNT(dc.id_elements_menu) as TotalPlats
FROM elements_menu em
INNER JOIN details_commande dc ON dc.id_elements_menu = em.id
GROUP BY em.id
HAVING TotalPlats > 2
ORDER BY TotalPlats DESC;

-- 6
SELECT COUNT(*)
FROM elements_menu em
GROUP BY id_sections_menu;

-- 7
SELECT i.nom, COUNT(*)
FROM ingredient i
INNER JOIN elements_menu_ingredient emi ON emi.id_ingredient = i.id
INNER JOIN elements_menu em ON em.id = emi.id_elements_menu
INNER JOIN sections_menu sm ON sm.id = em.id_sections_menu
WHERE sm.nom IN ('dessert')
GROUP BY i.nom
ORDER BY count(*) DESC
LIMIT 1;

-- 8
SELECT i.nom
FROM ingredient i
LEFT JOIN elements_menu_ingredient emi ON emi.id_ingredient = i.id
WHERE emi.id_ingredient IS NULL;

-- 9
SELECT ec.nom, COUNT(*)
FROM commandes c
INNER JOIN etats_commande ec ON ec.id = c.id_etats_commande
GROUP BY ec.nom;

-- 10
SELECT DISTINCT(i.nom)
FROM ingredient i
LEFT JOIN elements_menu_ingredient emi ON emi.id_ingredient = i.id
LEFT JOIN elements_menu em ON em.id = emi.id_elements_menu
LEFT JOIN details_commande dc ON dc.id_elements_menu = em.id
WHERE emi.id_ingredient IS NOT NULL AND dc.id_elements_menu IS NULL;