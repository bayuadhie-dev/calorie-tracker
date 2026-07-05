import os
import json

OUTPUT_DIR = "/home/superadmin/Documents/APK project/calorie-tracker/src/db/seed"
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "food_items_local.json")

def main():
    # Define food items based on the spec
    food_items = []

    # Category 1: Nasi & Olahan Nasi (17 items)
    nasi_items = [
        ("Nasi Goreng", 163, 25, 3.5, 5.5, 250, "piring", 250),
        ("Nasi Goreng Spesial", 170, 24, 4.5, 6.0, 300, "piring", 300),
        ("Nasi Goreng Seafood", 165, 23, 5.0, 5.5, 280, "piring", 280),
        ("Nasi Uduk", 150, 28, 3.0, 3.0, 200, "piring", 200),
        ("Nasi Kuning", 140, 27, 3.0, 2.2, 200, "piring", 200),
        ("Nasi Padang", 180, 24, 6.0, 7.0, 350, "piring", 350),
        ("Nasi Bakar Ayam", 145, 22, 6.0, 3.5, 250, "bungkus", 250),
        ("Nasi Liwet", 142, 26, 3.0, 2.5, 250, "piring", 250),
        ("Nasi Kebuli", 160, 25, 4.5, 4.5, 250, "piring", 250),
        ("Nasi Campur", 155, 24, 5.5, 4.0, 300, "piring", 300),
        ("Nasi Pecel", 135, 24, 4.0, 2.5, 300, "piring", 300),
        ("Nasi Lemak", 168, 26, 3.5, 5.5, 250, "piring", 250),
        ("Nasi Jagung", 120, 25, 2.5, 1.0, 200, "piring", 200),
        ("Bubur Ayam", 75, 13, 3.0, 1.2, 300, "mangkok", 300),
        ("Bubur Manado", 60, 11, 1.5, 0.8, 300, "mangkok", 300),
        ("Lontong Sayur", 110, 16, 2.5, 4.0, 300, "porsi", 300),
        ("Ketupat Opor", 130, 15, 4.5, 5.5, 300, "porsi", 300)
    ]
    for name, cal, carb, prot, fat, serving, unit, eq in nasi_items:
        # Nasi is carb, default tags
        tags = ["PREF_RICE"]
        if "Seafood" in name:
            tags.extend(["ALLERGY_SEAFOOD", "no-seafood", "PREF_SEAFOOD"])
        if "Ayam" in name or "Opor" in name:
            tags.append("PREF_CHICKEN")
        if "Sayur" in name or "Manado" in name or "Pecel" in name:
            tags.append("PREF_VEGETABLE")
        
        # Determine vegetarian/vegan
        is_veg = True
        is_vegan = True
        for animal in ["Ayam", "Seafood", "Padang", "Campur", "Daging", "Opor", "Lontong", "Kebuli"]:
            if animal in name:
                is_veg = False
                is_vegan = False
        if is_vegan:
            tags.extend(["vegan", "vegetarian"])
        elif is_veg:
            tags.append("vegetarian")

        food_items.append({
            "name": name,
            "calorie_per_100g": cal,
            "carb_g": carb,
            "protein_g": prot,
            "fat_g": fat,
            "default_serving_g": float(serving),
            "source": "local",
            "is_custom": 0,
            "tags": tags,
            "portions": [
                {"unit_label": unit, "grams_equivalent": float(eq)},
                {"unit_label": "porsi (100g)", "grams_equivalent": 100.0}
            ]
        })

    # Category 2: Lauk Protein Olahan (22 items)
    lauk_items = [
        ("Rendang Sapi", 240, 4.0, 19.0, 16.0, 80, "potong", 80, ["no-beef", "PREF_BEEF"]),
        ("Rendang Ayam", 220, 4.0, 17.5, 14.0, 80, "potong", 80, ["PREF_CHICKEN"]),
        ("Opor Ayam", 195, 3.2, 16.0, 13.0, 90, "potong", 90, ["PREF_CHICKEN"]),
        ("Gulai Ayam", 205, 3.5, 15.5, 14.5, 100, "potong", 100, ["PREF_CHICKEN"]),
        ("Gulai Kambing", 185, 4.0, 14.0, 12.5, 150, "porsi", 150, []),
        ("Semur Daging", 190, 8.0, 16.5, 10.5, 100, "porsi", 100, ["no-beef", "PREF_BEEF"]),
        ("Semur Ayam", 180, 8.5, 15.0, 9.8, 90, "potong", 90, ["PREF_CHICKEN"]),
        ("Ayam Rica-Rica", 210, 3.0, 18.0, 14.0, 100, "potong", 100, ["PREF_CHICKEN"]),
        ("Ayam Geprek", 263, 12.0, 16.5, 16.5, 150, "porsi", 150, ["PREF_CHICKEN"]),
        ("Ayam Penyet", 245, 8.0, 17.0, 16.0, 150, "porsi", 150, ["PREF_CHICKEN"]),
        ("Ayam Woku", 195, 3.5, 18.5, 12.0, 100, "potong", 100, ["PREF_CHICKEN"]),
        ("Bebek Goreng", 290, 2.0, 18.0, 23.0, 180, "porsi", 180, []),
        ("Bebek Betutu", 230, 3.0, 19.0, 16.0, 200, "porsi", 200, []),
        ("Ikan Bakar", 140, 2.0, 18.5, 6.5, 150, "ekor sedang", 150, []),
        ("Ikan Goreng", 215, 6.0, 17.0, 13.5, 120, "ekor sedang", 120, []),
        ("Ikan Pindang", 130, 1.5, 19.0, 5.5, 100, "ekor", 100, []),
        ("Lele Goreng", 220, 8.0, 16.0, 14.0, 120, "ekor", 120, []),
        ("Lele Bakar", 150, 4.0, 17.0, 7.2, 130, "ekor", 130, []),
        ("Udang Goreng Tepung", 280, 22.0, 14.0, 15.0, 100, "porsi (5 ekor)", 100, ["ALLERGY_SEAFOOD", "no-seafood", "PREF_SEAFOOD"]),
        ("Cumi Goreng", 235, 11.0, 16.0, 14.0, 100, "porsi", 100, ["ALLERGY_SEAFOOD", "no-seafood", "PREF_SEAFOOD"]),
        ("Cumi Saus Padang", 185, 9.0, 15.5, 9.8, 120, "porsi", 120, ["ALLERGY_SEAFOOD", "no-seafood", "PREF_SEAFOOD"])
    ]
    for name, cal, carb, prot, fat, serving, unit, eq, tags in lauk_items:
        food_items.append({
            "name": name,
            "calorie_per_100g": cal,
            "carb_g": carb,
            "protein_g": prot,
            "fat_g": fat,
            "default_serving_g": float(serving),
            "source": "local",
            "is_custom": 0,
            "tags": tags,
            "portions": [
                {"unit_label": unit, "grams_equivalent": float(eq)},
                {"unit_label": "porsi (100g)", "grams_equivalent": 100.0}
            ]
        })

    # Category 3: Sayur & Tumisan (13 items)
    sayur_items = [
        ("Cap Cay", 65, 5.5, 2.5, 3.5, 200, "porsi", 200, ["PREF_VEGETABLE"]),
        ("Tumis Kangkung", 78, 4.0, 2.2, 6.0, 150, "porsi", 150, ["PREF_VEGETABLE"]),
        ("Tumis Buncis", 82, 6.5, 2.0, 5.5, 150, "porsi", 150, ["PREF_VEGETABLE"]),
        ("Tumis Taoge", 70, 4.5, 2.5, 4.8, 100, "porsi", 100, ["PREF_VEGETABLE"]),
        ("Sayur Asem", 35, 6.8, 1.2, 0.5, 250, "mangkok", 250, ["PREF_VEGETABLE"]),
        ("Sayur Lodeh", 95, 7.5, 2.0, 6.8, 250, "mangkok", 250, ["PREF_VEGETABLE"]),
        ("Sayur Sop", 45, 6.0, 1.8, 1.5, 250, "mangkok", 250, ["PREF_VEGETABLE"]),
        ("Gado-Gado", 145, 15.0, 6.0, 7.0, 300, "piring", 300, ["PREF_VEGETABLE", "ALLERGY_PEANUT", "no-nuts"]),
        ("Pecel", 130, 13.0, 5.0, 6.5, 250, "piring", 250, ["PREF_VEGETABLE", "ALLERGY_PEANUT", "no-nuts"]),
        ("Karedok", 115, 10.0, 4.5, 6.2, 200, "piring", 200, ["PREF_VEGETABLE", "ALLERGY_PEANUT", "no-nuts"]),
        ("Lalapan", 25, 4.5, 1.2, 0.2, 100, "porsi", 100, ["PREF_VEGETABLE"]),
        ("Plecing Kangkung", 55, 5.0, 2.0, 3.2, 150, "porsi", 150, ["PREF_VEGETABLE"]),
        ("Urap-Urap", 98, 9.0, 3.2, 5.5, 150, "porsi", 150, ["PREF_VEGETABLE"])
    ]
    for name, cal, carb, prot, fat, serving, unit, eq, tags in sayur_items:
        # All sayur items contain vegetables. Under NO_VEGETABLE restriction, we exclude dishes containing vegetables.
        # So we add the "NO_VEGETABLE" tag to all vegetable dishes!
        full_tags = tags + ["NO_VEGETABLE"]
        
        # Veg / Vegan heuristics
        is_vegan = True
        if "Lodeh" in name or "Gado" in name or "Pecel" in name: # might contain shrimp paste or egg
            is_vegan = False
        if is_vegan:
            full_tags.extend(["vegan", "vegetarian"])
        else:
            full_tags.append("vegetarian")

        food_items.append({
            "name": name,
            "calorie_per_100g": cal,
            "carb_g": carb,
            "protein_g": prot,
            "fat_g": fat,
            "default_serving_g": float(serving),
            "source": "local",
            "is_custom": 0,
            "tags": full_tags,
            "portions": [
                {"unit_label": unit, "grams_equivalent": float(eq)},
                {"unit_label": "porsi (100g)", "grams_equivalent": 100.0}
            ]
        })

    # Category 4: Mie & Pasta (13 items)
    mie_items = [
        ("Mie Goreng Homemade", 180, 28.0, 5.0, 5.2, 250, "piring", 250, ["PREF_NOODLE"]),
        ("Mie Kuah Homemade", 130, 20.0, 4.2, 3.8, 300, "mangkok", 300, ["PREF_NOODLE"]),
        ("Mie Ayam", 160, 22.0, 6.8, 4.8, 350, "mangkok", 350, ["PREF_NOODLE", "PREF_CHICKEN"]),
        ("Mie Bakso", 125, 15.0, 6.2, 4.5, 400, "mangkok", 400, ["PREF_NOODLE"]),
        ("Mie Aceh", 175, 25.0, 7.0, 5.5, 350, "porsi", 350, ["PREF_NOODLE"]),
        ("Mie Tek-Tek", 165, 24.0, 5.5, 5.0, 300, "porsi", 300, ["PREF_NOODLE"]),
        ("Bihun Goreng", 195, 32.0, 4.0, 5.5, 200, "piring", 200, ["PREF_NOODLE"]),
        ("Bihun Kuah", 110, 20.0, 3.0, 2.0, 300, "mangkok", 300, ["PREF_NOODLE"]),
        ("Kwetiau Goreng", 210, 34.0, 4.5, 6.2, 250, "piring", 250, ["PREF_NOODLE"]),
        ("Kwetiau Kuah", 120, 21.0, 3.8, 2.2, 350, "mangkok", 350, ["PREF_NOODLE"]),
        ("Bakmie Goreng", 190, 28.0, 5.5, 5.8, 250, "piring", 250, ["PREF_NOODLE"]),
        ("Spaghetti Bolognese", 150, 22.0, 6.5, 4.0, 300, "piring", 300, ["PREF_NOODLE", "no-beef", "PREF_BEEF"]),
        ("Fettuccine Carbonara", 220, 20.0, 8.0, 12.0, 280, "piring", 280, ["PREF_NOODLE", "ALLERGY_LACTOSE", "no-dairy"])
    ]
    for name, cal, carb, prot, fat, serving, unit, eq, tags in mie_items:
        food_items.append({
            "name": name,
            "calorie_per_100g": cal,
            "carb_g": carb,
            "protein_g": prot,
            "fat_g": fat,
            "default_serving_g": float(serving),
            "source": "local",
            "is_custom": 0,
            "tags": tags,
            "portions": [
                {"unit_label": unit, "grams_equivalent": float(eq)},
                {"unit_label": "porsi (100g)", "grams_equivalent": 100.0}
            ]
        })

    # Category 5: Makanan Berkuah (15 items)
    kuah_items = [
        ("Bakso Sapi", 110, 8.0, 9.0, 4.5, 400, "mangkok", 400, ["no-beef", "PREF_BEEF"]),
        ("Bakso Ayam", 100, 7.5, 8.5, 4.0, 380, "mangkok", 380, ["PREF_CHICKEN"]),
        ("Bakso Ikan", 80, 6.0, 8.0, 2.5, 350, "mangkok", 350, []),
        ("Soto Ayam", 85, 6.2, 7.8, 3.2, 350, "mangkok", 350, ["PREF_CHICKEN"]),
        ("Soto Betawi", 150, 8.0, 9.5, 9.2, 400, "mangkok", 400, ["no-beef", "PREF_BEEF", "ALLERGY_LACTOSE", "no-dairy"]),
        ("Soto Lamongan", 90, 6.5, 8.0, 3.5, 350, "mangkok", 350, ["PREF_CHICKEN"]),
        ("Soto Madura", 105, 5.8, 10.0, 4.5, 350, "mangkok", 350, ["no-beef", "PREF_BEEF"]),
        ("Rawon", 115, 4.0, 11.5, 5.8, 400, "mangkok", 400, ["no-beef", "PREF_BEEF"]),
        ("Tongseng", 140, 8.5, 10.5, 7.2, 350, "mangkok", 350, []),
        ("Konro Bakar", 240, 5.0, 21.0, 15.0, 300, "porsi", 300, ["no-beef", "PREF_BEEF"]),
        ("Sup Ayam", 50, 4.5, 4.2, 1.6, 350, "mangkok", 350, ["PREF_CHICKEN", "NO_VEGETABLE"]),
        ("Sup Buntut", 120, 5.2, 11.0, 6.2, 400, "mangkok", 400, ["no-beef", "PREF_BEEF", "NO_VEGETABLE"]),
        ("Sup Iga", 125, 4.8, 12.0, 6.5, 400, "mangkok", 400, ["no-beef", "PREF_BEEF", "NO_VEGETABLE"]),
        ("Tom Yam", 75, 5.5, 6.8, 3.0, 350, "mangkok", 350, ["ALLERGY_SEAFOOD", "no-seafood", "PREF_SEAFOOD"]),
        ("Sop Buntut Goreng", 195, 6.0, 16.5, 11.5, 350, "porsi", 350, ["no-beef", "PREF_BEEF", "NO_VEGETABLE"])
    ]
    for name, cal, carb, prot, fat, serving, unit, eq, tags in kuah_items:
        food_items.append({
            "name": name,
            "calorie_per_100g": cal,
            "carb_g": carb,
            "protein_g": prot,
            "fat_g": fat,
            "default_serving_g": float(serving),
            "source": "local",
            "is_custom": 0,
            "tags": tags,
            "portions": [
                {"unit_label": unit, "grams_equivalent": float(eq)},
                {"unit_label": "porsi (100g)", "grams_equivalent": 100.0}
            ]
        })

    # Category 6: Gorengan & Jajanan Pasar (30 items)
    gorengan_items = [
        ("Pisang Goreng", 252, 42.0, 2.0, 10.0, 80, "buah", 80, ["PREF_FRUIT"]),
        ("Pisang Kepok Goreng", 260, 44.0, 2.1, 9.8, 90, "buah", 90, ["PREF_FRUIT"]),
        ("Ubi Goreng", 220, 36.0, 1.8, 8.5, 60, "potong", 60, ["vegetarian", "vegan"]),
        ("Singkong Goreng", 240, 38.0, 1.5, 9.2, 70, "potong", 70, ["vegetarian", "vegan"]),
        ("Bakwan Sayur", 280, 22.0, 4.0, 20.0, 60, "buah", 60, ["PREF_VEGETABLE", "NO_VEGETABLE"]),
        ("Bakwan Jagung", 270, 24.0, 4.2, 18.0, 65, "buah", 65, ["PREF_VEGETABLE", "NO_VEGETABLE"]),
        ("Risoles Ragout", 215, 20.0, 5.5, 12.5, 80, "buah", 80, ["ALLERGY_LACTOSE", "no-dairy"]),
        ("Risoles Mayo", 290, 18.0, 6.0, 21.0, 85, "buah", 85, ["ALLERGY_LACTOSE", "no-dairy"]),
        ("Pastel", 240, 25.0, 4.8, 13.5, 90, "buah", 90, []),
        ("Lumpia Semarang", 185, 24.0, 6.0, 7.2, 100, "buah", 100, []),
        ("Lumpia Goreng", 220, 23.0, 5.0, 12.0, 80, "buah", 80, []),
        ("Cireng", 360, 85.0, 1.0, 2.0, 30, "buah", 30, ["vegetarian", "vegan"]),
        ("Cilung", 320, 60.0, 4.0, 7.0, 25, "buah", 25, ["PREF_EGG"]),
        ("Batagor", 290, 28.0, 8.0, 16.0, 150, "porsi", 150, ["ALLERGY_PEANUT", "no-nuts"]),
        ("Siomay", 160, 15.0, 10.0, 6.0, 200, "porsi", 200, ["ALLERGY_PEANUT", "no-nuts"]),
        ("Pempek Kapal Selam", 190, 25.0, 10.0, 5.0, 150, "buah", 150, ["PREF_EGG"]),
        ("Pempek Lenjer", 165, 24.0, 8.0, 4.0, 80, "buah", 80, []),
        ("Tekwan", 95, 15.0, 6.5, 1.2, 300, "mangkok", 300, ["ALLERGY_SEAFOOD", "no-seafood", "PREF_SEAFOOD"]),
        ("Martabak Telur", 250, 18.0, 11.0, 15.0, 150, "1/4 loyang", 150, ["PREF_EGG"]),
        ("Martabak Manis Coklat", 335, 52.0, 6.0, 11.5, 120, "1/4 loyang", 120, ["ALLERGY_LACTOSE", "no-dairy"]),
        ("Martabak Manis Keju", 345, 48.0, 8.0, 13.5, 120, "1/4 loyang", 120, ["ALLERGY_LACTOSE", "no-dairy"]),
        ("Kue Putu", 215, 45.0, 2.5, 3.0, 60, "2 buah", 60, ["vegetarian", "vegan"]),
        ("Klepon", 210, 46.0, 2.0, 2.0, 60, "3 buah", 60, ["vegetarian", "vegan"]),
        ("Onde-onde", 300, 52.0, 5.0, 8.0, 50, "buah", 50, ["vegetarian", "vegan"]),
        ("Getuk", 175, 38.0, 1.2, 2.0, 60, "potong", 60, ["vegetarian", "vegan"]),
        ("Cenil", 160, 39.0, 0.5, 0.2, 80, "porsi", 80, ["vegetarian", "vegan"]),
        ("Serabi", 150, 28.0, 2.0, 3.5, 80, "buah", 80, ["vegetarian", "vegan"]),
        ("Apem", 130, 29.0, 1.8, 0.8, 50, "buah", 50, ["vegetarian", "vegan"]),
        ("Lemper", 210, 32.0, 6.0, 6.5, 80, "buah", 80, ["PREF_CHICKEN"]),
        ("Lapis Legit", 390, 50.0, 4.8, 19.5, 50, "potong", 50, ["PREF_EGG", "ALLERGY_LACTOSE", "no-dairy", "vegetarian"])
    ]
    for name, cal, carb, prot, fat, serving, unit, eq, tags in gorengan_items:
        # Heuristics for fruit/vegetable tags
        h_tags = list(tags)
        if "Pisang" in name:
            h_tags.append("NO_FRUIT")
        if "Sayur" in name or "Jagung" in name:
            h_tags.append("NO_VEGETABLE")
            
        food_items.append({
            "name": name,
            "calorie_per_100g": cal,
            "carb_g": carb,
            "protein_g": prot,
            "fat_g": fat,
            "default_serving_g": float(serving),
            "source": "local",
            "is_custom": 0,
            "tags": h_tags,
            "portions": [
                {"unit_label": unit, "grams_equivalent": float(eq)},
                {"unit_label": "porsi (100g)", "grams_equivalent": 100.0}
            ]
        })

    # Category 7: Sate & Bakar-bakaran (11 items)
    sate_items = [
        ("Sate Ayam", 200, 6.0, 18.0, 11.5, 100, "5 tusuk", 100, ["PREF_CHICKEN", "ALLERGY_PEANUT", "no-nuts"]),
        ("Sate Sapi", 220, 6.0, 19.0, 13.0, 100, "5 tusuk", 100, ["no-beef", "PREF_BEEF", "ALLERGY_PEANUT", "no-nuts"]),
        ("Sate Kambing", 240, 5.0, 18.5, 16.0, 100, "5 tusuk", 100, ["ALLERGY_PEANUT", "no-nuts"]),
        ("Sate Padang", 185, 12.0, 16.0, 8.5, 120, "5 tusuk", 120, ["no-beef", "PREF_BEEF"]),
        ("Sate Lilit", 190, 8.0, 15.5, 10.8, 100, "5 tusuk", 100, ["ALLERGY_SEAFOOD", "no-seafood", "PREF_SEAFOOD"]),
        ("Sate Maranggi", 215, 9.0, 18.5, 11.5, 100, "5 tusuk", 100, ["no-beef", "PREF_BEEF"]),
        ("Sate Taichan", 150, 1.5, 21.0, 6.8, 80, "5 tusuk", 80, ["PREF_CHICKEN"]),
        ("Sate Usus", 260, 2.5, 17.5, 20.0, 60, "5 tusuk", 60, ["PREF_CHICKEN"]),
        ("Sate Telur Puyuh", 185, 1.2, 13.0, 14.5, 75, "5 tusuk", 75, ["PREF_EGG", "vegetarian"]),
        ("Sosis Bakar", 265, 8.0, 12.0, 20.5, 60, "buah", 60, []),
        ("Jagung Bakar", 130, 25.0, 3.2, 2.2, 150, "buah", 150, ["NO_VEGETABLE", "PREF_VEGETABLE", "vegetarian", "vegan"])
    ]
    for name, cal, carb, prot, fat, serving, unit, eq, tags in sate_items:
        food_items.append({
            "name": name,
            "calorie_per_100g": cal,
            "carb_g": carb,
            "protein_g": prot,
            "fat_g": fat,
            "default_serving_g": float(serving),
            "source": "local",
            "is_custom": 0,
            "tags": tags,
            "portions": [
                {"unit_label": unit, "grams_equivalent": float(eq)},
                {"unit_label": "porsi (100g)", "grams_equivalent": 100.0}
            ]
        })

    # Category 8: Fast Food (14 items)
    fast_items = [
        ("Ayam KFC Original", 240, 8.0, 19.5, 14.5, 120, "potong", 120, ["PREF_CHICKEN"]),
        ("Ayam KFC Crispy", 270, 13.0, 18.0, 16.5, 130, "potong", 130, ["PREF_CHICKEN"]),
        ("McD McChicken", 280, 28.0, 12.0, 13.0, 180, "burger", 180, ["PREF_CHICKEN", "ALLERGY_LACTOSE", "no-dairy"]),
        ("McD Ayam Goreng", 260, 9.0, 18.5, 16.0, 110, "potong", 110, ["PREF_CHICKEN"]),
        ("McD Nasi + Ayam", 175, 23.0, 7.8, 6.2, 400, "paket", 400, ["PREF_CHICKEN", "PREF_RICE"]),
        ("McD Big Mac", 257, 20.0, 12.5, 14.0, 200, "burger", 200, ["no-beef", "PREF_BEEF", "ALLERGY_LACTOSE", "no-dairy"]),
        ("Pizza Margherita", 250, 30.0, 11.0, 9.5, 100, "slice", 100, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Pizza Pepperoni", 290, 29.0, 12.5, 14.0, 110, "slice", 110, ["no-beef", "PREF_BEEF", "ALLERGY_LACTOSE", "no-dairy"]),
        ("Burger Ayam", 260, 26.0, 11.5, 12.2, 180, "buah", 180, ["PREF_CHICKEN", "ALLERGY_LACTOSE", "no-dairy"]),
        ("Burger Beef", 275, 25.0, 13.0, 14.0, 200, "buah", 200, ["no-beef", "PREF_BEEF", "ALLERGY_LACTOSE", "no-dairy"]),
        ("Hot Dog", 290, 24.0, 10.5, 17.0, 120, "buah", 120, []),
        ("Kentang Goreng Medium", 312, 41.0, 3.4, 15.0, 120, "porsi", 120, ["vegetarian", "vegan"]),
        ("Nugget Ayam", 295, 18.0, 15.0, 18.0, 100, "5 pcs", 100, ["PREF_CHICKEN"]),
        ("Sosis Goreng", 300, 4.0, 12.0, 26.5, 60, "buah", 60, [])
    ]
    for name, cal, carb, prot, fat, serving, unit, eq, tags in fast_items:
        food_items.append({
            "name": name,
            "calorie_per_100g": cal,
            "carb_g": carb,
            "protein_g": prot,
            "fat_g": fat,
            "default_serving_g": float(serving),
            "source": "local",
            "is_custom": 0,
            "tags": tags,
            "portions": [
                {"unit_label": unit, "grams_equivalent": float(eq)},
                {"unit_label": "porsi (100g)", "grams_equivalent": 100.0}
            ]
        })

    # Category 9: Mie Instan (12 items)
    instant_items = [
        ("Indomie Goreng Original", 458, 62.0, 9.0, 19.0, 85, "bungkus", 85, ["PREF_NOODLE"]),
        ("Indomie Goreng Rendang", 460, 61.5, 9.0, 19.5, 85, "bungkus", 85, ["PREF_NOODLE"]),
        ("Indomie Goreng Ayam Bawang", 455, 63.0, 8.5, 18.5, 85, "bungkus", 85, ["PREF_NOODLE", "PREF_CHICKEN"]),
        ("Indomie Kuah Ayam Bawang", 435, 61.0, 8.7, 17.0, 69, "bungkus", 69, ["PREF_NOODLE", "PREF_CHICKEN"]),
        ("Indomie Kuah Soto", 430, 60.0, 8.5, 16.8, 70, "bungkus", 70, ["PREF_NOODLE"]),
        ("Indomie Kuah Kari Ayam", 442, 59.0, 8.8, 18.8, 70, "bungkus", 70, ["PREF_NOODLE", "PREF_CHICKEN"]),
        ("Pop Mie Goreng", 450, 60.0, 8.5, 19.0, 75, "cup", 75, ["PREF_NOODLE"]),
        ("Pop Mie Kuah", 420, 58.0, 8.0, 16.5, 75, "cup", 75, ["PREF_NOODLE"]),
        ("Mie Sedaap Goreng", 470, 61.0, 9.2, 20.8, 87, "bungkus", 87, ["PREF_NOODLE"]),
        ("Mie Sedaap Kuah", 430, 59.0, 8.5, 17.5, 72, "bungkus", 72, ["PREF_NOODLE"]),
        ("Supermi Goreng", 450, 62.0, 8.8, 18.2, 82, "bungkus", 82, ["PREF_NOODLE"]),
        ("Sarimi Kuah", 445, 63.0, 8.5, 17.8, 65, "bungkus", 65, ["PREF_NOODLE"])
    ]
    for name, cal, carb, prot, fat, serving, unit, eq, tags in instant_items:
        food_items.append({
            "name": name,
            "calorie_per_100g": cal,
            "carb_g": carb,
            "protein_g": prot,
            "fat_g": fat,
            "default_serving_g": float(serving),
            "source": "local",
            "is_custom": 0,
            "tags": tags,
            "portions": [
                {"unit_label": unit, "grams_equivalent": float(eq)},
                {"unit_label": "porsi (100g)", "grams_equivalent": 100.0}
            ]
        })

    # Category 10: Roti & Sarapan (15 items)
    bread_items = [
        ("Roti Tawar", 264, 49.0, 8.0, 3.2, 25, "lembar", 25, ["vegetarian"]),
        ("Roti Gandum", 247, 43.0, 9.0, 3.5, 28, "lembar", 28, ["vegetarian"]),
        ("Roti Bakar Selai", 310, 58.0, 6.0, 5.5, 60, "2 lembar", 60, ["vegetarian"]),
        ("Roti Bakar Coklat Keju", 335, 54.0, 8.0, 9.8, 70, "2 lembar", 70, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Roti Sobek", 280, 52.0, 7.5, 4.8, 40, "buah", 40, ["vegetarian"]),
        ("Croissant", 406, 45.0, 8.2, 21.0, 60, "buah", 60, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Donat Glazed", 360, 48.0, 4.5, 16.5, 75, "buah", 75, ["vegetarian"]),
        ("Donat Coklat", 380, 50.0, 5.0, 18.0, 80, "buah", 80, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Sandwich Ayam", 215, 22.0, 14.5, 7.8, 150, "buah", 150, ["PREF_CHICKEN"]),
        ("Sandwich Telur", 230, 24.0, 11.0, 9.8, 130, "buah", 130, ["PREF_EGG", "vegetarian"]),
        ("Pancake", 227, 28.0, 6.0, 10.0, 70, "lembar", 70, ["vegetarian"]),
        ("Waffle", 291, 33.0, 6.0, 15.0, 90, "buah", 90, ["vegetarian"]),
        ("Granola + Susu", 140, 22.0, 4.5, 3.8, 280, "porsi", 280, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Oatmeal Polos", 379, 67.0, 13.0, 6.5, 40, "porsi", 40, ["vegetarian", "vegan"]),
        ("Oatmeal Madu", 385, 70.0, 12.0, 6.0, 45, "porsi", 45, ["vegetarian"])
    ]
    for name, cal, carb, prot, fat, serving, unit, eq, tags in bread_items:
        food_items.append({
            "name": name,
            "calorie_per_100g": cal,
            "carb_g": carb,
            "protein_g": prot,
            "fat_g": fat,
            "default_serving_g": float(serving),
            "source": "local",
            "is_custom": 0,
            "tags": tags,
            "portions": [
                {"unit_label": unit, "grams_equivalent": float(eq)},
                {"unit_label": "porsi (100g)", "grams_equivalent": 100.0}
            ]
        })

    # Category 11: Cemilan Asin & Gurih (16 items)
    snack_items = [
        ("Chitato Original", 530, 54.0, 7.0, 31.0, 68, "bungkus kecil", 68, ["vegetarian"]),
        ("Chitato Sapi Panggang", 535, 55.0, 6.8, 32.0, 68, "bungkus kecil", 68, ["no-beef", "PREF_BEEF"]),
        ("Piattos", 510, 58.0, 6.0, 28.0, 65, "bungkus", 65, ["vegetarian"]),
        ("Taro", 480, 62.0, 5.0, 23.0, 65, "bungkus", 65, []),
        ("Cheetos", 543, 56.0, 6.0, 33.0, 55, "bungkus", 55, []),
        ("Lays", 520, 53.0, 7.0, 31.0, 68, "bungkus", 68, ["vegetarian"]),
        ("Maicih Level 3", 512, 58.0, 6.0, 28.5, 55, "bungkus", 55, ["vegetarian", "vegan"]),
        ("Maicih Level 10", 515, 57.0, 6.2, 29.0, 55, "bungkus", 55, ["vegetarian", "vegan"]),
        ("Kacang Garuda", 580, 21.0, 26.0, 48.0, 100, "bungkus", 100, ["ALLERGY_PEANUT", "no-nuts", "vegetarian", "vegan"]),
        ("Kacang Kulit", 560, 20.0, 25.0, 45.0, 30, "genggam", 30, ["ALLERGY_PEANUT", "no-nuts", "vegetarian", "vegan"]),
        ("Keripik Singkong", 480, 64.0, 2.0, 24.0, 60, "bungkus", 60, ["vegetarian", "vegan"]),
        ("Keripik Pisang", 510, 62.0, 2.5, 28.0, 60, "bungkus", 60, ["PREF_FRUIT", "vegetarian", "vegan"]),
        ("Basreng", 490, 54.0, 15.0, 23.0, 50, "bungkus", 50, []),
        ("Cuanki", 320, 45.0, 8.0, 12.0, 150, "porsi", 150, []),
        ("Momogi", 460, 64.0, 6.0, 20.0, 55, "bungkus", 55, ["vegetarian"]),
        ("Qtela", 490, 63.0, 2.2, 25.5, 65, "bungkus", 65, ["vegetarian", "vegan"])
    ]
    for name, cal, carb, prot, fat, serving, unit, eq, tags in snack_items:
        h_tags = list(tags)
        if "Pisang" in name:
            h_tags.append("NO_FRUIT")
        food_items.append({
            "name": name,
            "calorie_per_100g": cal,
            "carb_g": carb,
            "protein_g": prot,
            "fat_g": fat,
            "default_serving_g": float(serving),
            "source": "local",
            "is_custom": 0,
            "tags": h_tags,
            "portions": [
                {"unit_label": unit, "grams_equivalent": float(eq)},
                {"unit_label": "porsi (100g)", "grams_equivalent": 100.0}
            ]
        })

    # Category 12: Coklat & Candy (25 items)
    candy_items = [
        ("Silverqueen Cashew", 555, 52.0, 9.0, 34.0, 62, "batang", 62, ["ALLERGY_PEANUT", "no-nuts", "ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Silverqueen Chunky Bar", 560, 51.0, 9.5, 35.0, 55, "batang", 55, ["ALLERGY_PEANUT", "no-nuts", "ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Silverqueen Almonds", 550, 53.0, 10.0, 33.0, 62, "batang", 62, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Kit Kat Original", 518, 64.5, 6.5, 26.0, 41.5, "2 fingers", 41.5, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Kit Kat Big", 518, 64.5, 6.5, 26.0, 45, "4 fingers", 45, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Kit Kat Big Matcha", 525, 65.0, 6.0, 27.0, 45, "4 fingers", 45, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Kit Kat Big Cookies & Cream", 530, 63.5, 6.2, 28.0, 45, "4 fingers", 45, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Kit Kat Chunky Original", 520, 62.0, 6.5, 27.0, 50, "batang", 50, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Kit Kat Chunky Peanut Butter", 540, 55.0, 9.0, 31.0, 50, "batang", 50, ["ALLERGY_PEANUT", "no-nuts", "ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Cadbury Dairy Milk", 534, 57.0, 7.3, 30.0, 45, "batang", 45, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Cadbury Oreo", 540, 58.0, 6.5, 31.0, 41, "batang", 41, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Snickers", 488, 60.0, 8.6, 24.0, 52, "batang", 52, ["ALLERGY_PEANUT", "no-nuts", "ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Twix", 502, 64.0, 4.4, 25.0, 50, "batang", 50, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Mars Bar", 448, 70.0, 4.0, 17.0, 51, "batang", 51, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Bounty", 487, 59.0, 3.7, 26.0, 57, "batang", 57, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("M&M's Peanut", 516, 59.0, 9.6, 26.0, 45, "bungkus", 45, ["ALLERGY_PEANUT", "no-nuts", "ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("M&M's Chocolate", 480, 70.0, 5.0, 20.0, 45, "bungkus", 45, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Toblerone", 525, 60.0, 5.4, 29.0, 30, "3 segitiga", 30, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Ferrero Rocher", 576, 44.0, 8.2, 42.0, 12.5, "biji", 12.5, ["ALLERGY_PEANUT", "no-nuts", "ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Kinder Bueno", 572, 49.5, 8.6, 37.3, 43, "2 finger", 43, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Kinder Joy", 550, 52.0, 7.5, 34.0, 20, "buah", 20, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Pocky Coklat", 485, 69.0, 8.0, 20.0, 47, "bungkus", 47, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Pocky Strawberry", 490, 70.0, 7.5, 20.5, 47, "bungkus", 47, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian", "NO_FRUIT"]),
        ("Pocky Matcha", 488, 70.0, 7.8, 20.0, 47, "bungkus", 47, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Choki-Choki", 520, 60.0, 5.0, 28.0, 15, "tube", 15, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Yupi Gummy", 320, 75.0, 5.0, 0.1, 55, "bungkus", 55, []),
        ("Relaxa", 390, 97.0, 0.0, 0.0, 3.2, "permen", 3.2, ["vegetarian", "vegan"]),
        ("Kopiko Candy", 430, 90.0, 1.0, 7.5, 4, "permen", 4, ["vegetarian"]),
        ("Mentos Original", 390, 92.0, 0.0, 1.5, 10, "3 butir", 10, ["vegetarian", "vegan"]),
        ("Tic Tac", 395, 96.0, 0.0, 0.5, 1.9, "butir", 1.9, ["vegetarian", "vegan"])
    ]
    for name, cal, carb, prot, fat, serving, unit, eq, tags in candy_items:
        food_items.append({
            "name": name,
            "calorie_per_100g": cal,
            "carb_g": carb,
            "protein_g": prot,
            "fat_g": fat,
            "default_serving_g": float(serving),
            "source": "local",
            "is_custom": 0,
            "tags": tags,
            "portions": [
                {"unit_label": unit, "grams_equivalent": float(eq)},
                {"unit_label": "porsi (100g)", "grams_equivalent": 100.0}
            ]
        })

    # Category 13: Wafer & Biskuit Manis (24 items)
    wafer_items = [
        ("Take It Wafer Coklat", 500, 62.0, 6.0, 25.0, 18, "batang", 18, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Take It Wafer Vanilla", 510, 63.0, 5.5, 26.0, 18, "batang", 18, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Take It Wafer Strawberry", 505, 63.0, 5.8, 25.5, 18, "batang", 18, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian", "NO_FRUIT"]),
        ("Tango Wafer Coklat", 490, 65.0, 6.0, 22.0, 55, "bungkus", 55, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Tango Wafer Keju", 500, 64.0, 7.0, 23.0, 55, "bungkus", 55, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Richeese Wafer", 500, 65.0, 6.5, 23.0, 45, "bungkus", 45, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Selamat Wafer", 480, 66.0, 5.8, 21.0, 50, "bungkus", 50, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Khong Guan", 460, 70.0, 7.0, 16.0, 30, "3 keping", 30, ["vegetarian"]),
        ("Monde Butter Cookies", 510, 62.0, 6.0, 26.0, 30, "3 keping", 30, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Roma Malkist Coklat", 480, 68.0, 6.0, 20.0, 135, "bungkus", 135, ["vegetarian"]),
        ("Roma Malkist Keju", 490, 66.0, 7.0, 22.0, 135, "bungkus", 135, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Nabati Richeese", 500, 65.0, 6.5, 23.0, 30, "bungkus", 30, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Nabati Ricoco", 490, 66.0, 6.0, 22.0, 30, "bungkus", 30, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Beng-Beng", 480, 66.0, 6.0, 21.0, 35, "batang", 35, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Beng-Beng Maxx", 480, 66.0, 6.0, 21.0, 58, "batang", 58, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Gery Chocolatos", 460, 70.0, 5.0, 18.0, 24, "bungkus", 24, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Gery Saluut", 510, 64.0, 5.5, 26.0, 45, "bungkus", 45, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Oreo Original", 490, 70.0, 4.0, 21.0, 34, "3 keping", 34, ["vegetarian"]),
        ("Good Time", 495, 65.0, 5.0, 24.0, 54, "bungkus", 54, ["vegetarian"]),
        ("Biskuat", 460, 72.0, 6.5, 16.0, 40, "bungkus", 40, ["vegetarian"]),
        ("Roma Kelapa", 470, 70.0, 6.8, 18.0, 40, "4 keping", 40, ["vegetarian"]),
        ("Regal", 440, 76.0, 7.5, 11.5, 40, "4 keping", 40, ["vegetarian"]),
        ("Marie Regal", 440, 76.0, 7.5, 11.5, 40, "4 keping", 40, ["vegetarian"])
    ]
    for name, cal, carb, prot, fat, serving, unit, eq, tags in wafer_items:
        food_items.append({
            "name": name,
            "calorie_per_100g": cal,
            "carb_g": carb,
            "protein_g": prot,
            "fat_g": fat,
            "default_serving_g": float(serving),
            "source": "local",
            "is_custom": 0,
            "tags": tags,
            "portions": [
                {"unit_label": unit, "grams_equivalent": float(eq)},
                {"unit_label": "porsi (100g)", "grams_equivalent": 100.0}
            ]
        })

    # Category 14: Es Krim Kemasan (10 items)
    ice_items = [
        ("Walls Paddle Pop", 120, 22.0, 1.5, 3.0, 65, "buah", 65, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Walls Cornetto", 220, 28.0, 3.0, 10.0, 80, "buah", 80, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Walls Magnum Classic", 280, 27.0, 3.2, 18.0, 100, "buah", 100, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Walls Magnum Almond", 300, 28.0, 4.0, 19.5, 100, "buah", 100, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Aice Mochi", 180, 32.0, 2.0, 4.8, 45, "buah", 45, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Aice Big Popsicle", 90, 21.0, 0.5, 0.5, 80, "buah", 80, ["vegetarian", "vegan"]),
        ("Aice Cheese Cup", 160, 18.0, 2.5, 9.0, 85, "cup", 85, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Campina Sundae Cup", 140, 20.0, 2.2, 5.8, 120, "cup", 120, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Campina Bazooka", 130, 21.0, 1.5, 4.5, 65, "buah", 65, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Mixue Ice Cream", 160, 22.0, 3.0, 6.8, 80, "scoop", 80, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"])
    ]
    for name, cal, carb, prot, fat, serving, unit, eq, tags in ice_items:
        food_items.append({
            "name": name,
            "calorie_per_100g": cal,
            "carb_g": carb,
            "protein_g": prot,
            "fat_g": fat,
            "default_serving_g": float(serving),
            "source": "local",
            "is_custom": 0,
            "tags": tags,
            "portions": [
                {"unit_label": unit, "grams_equivalent": float(eq)},
                {"unit_label": "porsi (100g)", "grams_equivalent": 100.0}
            ]
        })

    # Category 15: Kue & Dessert (17 items)
    dessert_items = [
        ("Brownies Coklat", 380, 52.0, 5.0, 18.0, 60, "potong", 60, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Bolu Kukus", 290, 58.0, 4.5, 4.2, 50, "buah", 50, ["vegetarian"]),
        ("Bolu Gulung", 320, 54.0, 5.2, 9.5, 60, "potong", 60, ["vegetarian"]),
        ("Kue Lapis", 250, 55.0, 2.2, 2.5, 50, "potong", 50, ["vegetarian", "vegan"]),
        ("Puding Coklat", 120, 22.0, 2.0, 2.8, 120, "cup", 120, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Puding Susu", 110, 21.0, 2.2, 2.0, 120, "cup", 120, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Es Krim Vanilla Homemade", 200, 24.0, 3.5, 10.0, 80, "scoop", 80, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Tiramisu", 280, 32.0, 4.5, 15.0, 100, "potong", 100, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Chesecake", 320, 30.0, 6.0, 20.0, 120, "potong", 120, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Kue Cubit", 290, 50.0, 5.5, 7.5, 60, "5 buah", 60, ["vegetarian"]),
        ("Cendol", 110, 23.0, 0.8, 1.8, 300, "gelas", 300, ["vegetarian", "vegan"]),
        ("Es Campur", 95, 22.0, 0.6, 1.0, 350, "gelas", 350, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Es Doger", 120, 24.0, 1.0, 2.5, 300, "gelas", 300, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Kolak Pisang", 135, 28.0, 1.5, 2.2, 250, "mangkok", 250, ["NO_FRUIT", "PREF_FRUIT", "vegetarian", "vegan"]),
        ("Kolak Ubi", 125, 26.0, 1.2, 2.0, 250, "mangkok", 250, ["vegetarian", "vegan"]),
        ("Bubur Sumsum", 115, 24.0, 1.5, 1.8, 200, "mangkok", 200, ["vegetarian", "vegan"]),
        ("Dawet", 110, 23.0, 0.8, 1.8, 300, "gelas", 300, ["vegetarian", "vegan"])
    ]
    for name, cal, carb, prot, fat, serving, unit, eq, tags in dessert_items:
        food_items.append({
            "name": name,
            "calorie_per_100g": cal,
            "carb_g": carb,
            "protein_g": prot,
            "fat_g": fat,
            "default_serving_g": float(serving),
            "source": "local",
            "is_custom": 0,
            "tags": tags,
            "portions": [
                {"unit_label": unit, "grams_equivalent": float(eq)},
                {"unit_label": "porsi (100g)", "grams_equivalent": 100.0}
            ]
        })

    # Category 16: Buah Segar & Olahan (18 items)
    fruit_items = [
        ("Pisang Ambon", 99, 25.8, 1.2, 0.2, 100, "buah", 100, ["PREF_FRUIT", "vegetarian", "vegan"]),
        ("Pisang Raja", 120, 31.0, 1.2, 0.2, 80, "buah", 80, ["PREF_FRUIT", "vegetarian", "vegan"]),
        ("Apel Merah", 52, 13.8, 0.3, 0.2, 150, "buah", 150, ["PREF_FRUIT", "vegetarian", "vegan"]),
        ("Apel Hijau", 50, 13.5, 0.3, 0.1, 150, "buah", 150, ["PREF_FRUIT", "vegetarian", "vegan"]),
        ("Jeruk Siam", 47, 11.8, 0.9, 0.1, 130, "buah", 130, ["PREF_FRUIT", "vegetarian", "vegan"]),
        ("Mangga Harum Manis", 65, 17.0, 0.5, 0.3, 200, "buah", 200, ["PREF_FRUIT", "vegetarian", "vegan"]),
        ("Melon", 36, 9.0, 0.8, 0.2, 150, "potong", 150, ["PREF_FRUIT", "vegetarian", "vegan"]),
        ("Semangka", 30, 7.5, 0.6, 0.2, 200, "potong", 200, ["PREF_FRUIT", "vegetarian", "vegan"]),
        ("Pepaya", 39, 9.8, 0.5, 0.1, 150, "potong", 150, ["PREF_FRUIT", "vegetarian", "vegan"]),
        ("Jambu Biji", 49, 11.8, 0.9, 0.3, 100, "buah", 100, ["PREF_FRUIT", "vegetarian", "vegan"]),
        ("Nanas", 50, 13.0, 0.5, 0.1, 100, "potong", 100, ["PREF_FRUIT", "vegetarian", "vegan"]),
        ("Alpukat", 160, 8.5, 2.0, 14.7, 100, "1/2 buah", 100, ["PREF_FRUIT", "vegetarian", "vegan"]),
        ("Anggur", 69, 18.0, 0.7, 0.2, 80, "10 biji", 80, ["PREF_FRUIT", "vegetarian", "vegan"]),
        ("Strawberry", 32, 7.7, 0.7, 0.3, 75, "5 buah", 75, ["PREF_FRUIT", "vegetarian", "vegan"]),
        ("Salak", 77, 20.9, 0.4, 0.4, 80, "2 buah", 80, ["PREF_FRUIT", "vegetarian", "vegan"]),
        ("Rambutan", 75, 18.0, 0.9, 0.2, 75, "5 buah", 75, ["PREF_FRUIT", "vegetarian", "vegan"]),
        ("Durian", 147, 27.0, 1.5, 5.3, 30, "biji", 30, ["PREF_FRUIT", "vegetarian", "vegan"]),
        ("Kelapa Muda", 40, 9.0, 1.0, 1.5, 300, "butir", 300, ["PREF_FRUIT", "vegetarian", "vegan"])
    ]
    for name, cal, carb, prot, fat, serving, unit, eq, tags in fruit_items:
        # All fruits are fruit. Under NO_FRUIT restriction, we exclude them.
        full_tags = tags + ["NO_FRUIT"]
        food_items.append({
            "name": name,
            "calorie_per_100g": cal,
            "carb_g": carb,
            "protein_g": prot,
            "fat_g": fat,
            "default_serving_g": float(serving),
            "source": "local",
            "is_custom": 0,
            "tags": full_tags,
            "portions": [
                {"unit_label": unit, "grams_equivalent": float(eq)},
                {"unit_label": "porsi (100g)", "grams_equivalent": 100.0}
            ]
        })

    # Category 17: Minuman Kemasan
    # 17.1 Kopi RTD (19 items)
    kopi_items = [
        ("Good Day Vanilla Latte", 56, 10.4, 1.2, 1.2, 250, "botol (250ml)", 250),
        ("Good Day Cappuccino", 56, 10.4, 1.2, 1.2, 250, "botol (250ml)", 250),
        ("Good Day Mocacinno", 56, 10.4, 1.2, 1.2, 250, "botol (250ml)", 250),
        ("Nescafe RTD Original", 58, 9.5, 1.6, 1.6, 240, "kaleng (240ml)", 240),
        ("Nescafe Latte", 58, 9.5, 1.6, 1.6, 240, "kaleng (240ml)", 240),
        ("Nescafe Caramel", 60, 10.0, 1.5, 1.6, 240, "kaleng (240ml)", 240),
        ("Luwak White Koffie RTD", 65, 12.0, 1.0, 1.5, 200, "botol (200ml)", 200),
        ("Torabika Cappuccino RTD", 68, 12.5, 1.2, 1.6, 200, "botol (200ml)", 200),
        ("ABC Susu", 62, 11.0, 1.5, 1.4, 200, "kotak (200ml)", 200),
        ("ABC Kopi Susu", 62, 11.0, 1.5, 1.4, 200, "botol (200ml)", 200),
        ("Kopiko 78°C Original", 54, 9.6, 1.2, 1.2, 240, "botol (240ml)", 240),
        ("Kopiko 78°C Latte", 54, 9.6, 1.2, 1.2, 240, "botol (240ml)", 240),
        ("Kopiko 78°C Mocca", 56, 10.0, 1.2, 1.2, 240, "botol (240ml)", 240),
        ("Golda Coffee Latte", 55, 10.0, 1.0, 1.2, 200, "botol (200ml)", 200),
        ("Golda Cappuccino", 55, 10.0, 1.0, 1.2, 200, "botol (200ml)", 200),
        ("TOP Coffee RTD", 50, 9.5, 0.8, 1.0, 200, "botol (200ml)", 200),
        ("Kapal Api RTD", 48, 10.5, 0.5, 0.5, 200, "botol (200ml)", 200),
        ("Fore Coffee Botol", 52, 9.0, 1.2, 1.2, 250, "botol (250ml)", 250),
        ("Indocafe Cappuccino RTD", 60, 11.0, 1.0, 1.3, 200, "botol (200ml)", 200)
    ]
    for name, cal, carb, prot, fat, serving, unit, eq in kopi_items:
        # All these coffees contain milk/dairy
        food_items.append({
            "name": name,
            "calorie_per_100g": cal,
            "carb_g": carb,
            "protein_g": prot,
            "fat_g": fat,
            "default_serving_g": float(serving),
            "source": "local",
            "is_custom": 0,
            "tags": ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"],
            "portions": [
                {"unit_label": unit, "grams_equivalent": float(eq)},
                {"unit_label": "porsi (100g)", "grams_equivalent": 100.0}
            ]
        })

    # 17.2 Susu & Dairy RTD (19 items)
    susu_items = [
        ("Ultra Milk Full Cream 200ml", 65, 4.5, 3.0, 3.5, 200, "kotak (200ml)", 200),
        ("Ultra Milk Coklat 200ml", 75, 11.0, 3.0, 2.0, 200, "kotak (200ml)", 200),
        ("Ultra Milk Strawberry 200ml", 75, 11.5, 3.0, 1.8, 200, "kotak (200ml)", 200),
        ("Ultra Milk Vanilla 200ml", 75, 11.0, 3.0, 2.0, 200, "kotak (200ml)", 200),
        ("Ultra Milk Full Cream 1L", 65, 4.5, 3.0, 3.5, 200, "porsi (200ml)", 200),
        ("Indomilk Full Cream 200ml", 65, 4.8, 3.0, 3.4, 200, "kotak (200ml)", 200),
        ("Indomilk Coklat 200ml", 78, 11.5, 3.0, 2.2, 200, "kotak (200ml)", 200),
        ("Frisian Flag Full Cream 200ml", 68, 5.0, 3.2, 3.6, 200, "kotak (200ml)", 200),
        ("Frisian Flag Coklat 200ml", 80, 12.0, 3.0, 2.2, 200, "kotak (200ml)", 200),
        ("Frisian Flag Strawberry 200ml", 78, 12.2, 3.0, 2.0, 200, "kotak (200ml)", 200),
        ("Greenfields Full Cream 200ml", 65, 4.5, 3.2, 3.5, 200, "kotak (200ml)", 200),
        ("Greenfields Coklat 200ml", 75, 11.0, 3.0, 2.0, 200, "kotak (200ml)", 200),
        ("Greenfields Strawberry 200ml", 75, 11.2, 3.0, 1.8, 200, "kotak (200ml)", 200),
        ("Milo UHT 200ml", 70, 12.0, 2.0, 1.6, 200, "kotak (200ml)", 200),
        ("Milo UHT 115ml", 70, 12.0, 2.0, 1.6, 115, "kotak (115ml)", 115),
        ("Cimory Fresh Milk 250ml", 72, 6.0, 3.2, 3.8, 250, "botol (250ml)", 250),
        ("Cimory Coklat 250ml", 84, 12.0, 3.2, 2.5, 250, "botol (250ml)", 250),
        ("Bear Brand 189ml", 63, 5.0, 3.2, 3.5, 189, "kaleng (189ml)", 189),
        ("Ensure Vanilla 237ml", 105, 13.5, 3.8, 3.8, 237, "kaleng (237ml)", 237)
    ]
    for name, cal, carb, prot, fat, serving, unit, eq in susu_items:
        food_items.append({
            "name": name,
            "calorie_per_100g": cal,
            "carb_g": carb,
            "protein_g": prot,
            "fat_g": fat,
            "default_serving_g": float(serving),
            "source": "local",
            "is_custom": 0,
            "tags": ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"],
            "portions": [
                {"unit_label": unit, "grams_equivalent": float(eq)},
                {"unit_label": "porsi (100g)", "grams_equivalent": 100.0}
            ]
        })

    # 17.3 Yogurt & Fermented (10 items)
    yogurt_items = [
        ("Cimory Yogurt Drink Original 250ml", 80, 14.0, 2.0, 1.5, 250, "botol (250ml)", 250),
        ("Cimory Yogurt Drink Strawberry 250ml", 84, 15.0, 2.0, 1.4, 250, "botol (250ml)", 250),
        ("Cimory Yogurt Drink Blueberry 250ml", 84, 15.0, 2.0, 1.4, 250, "botol (250ml)", 250),
        ("Cimory Greek Yogurt Plain 100g", 90, 8.0, 7.0, 3.0, 100, "cup (100g)", 100),
        ("Cimory Greek Yogurt Strawberry 100g", 110, 15.0, 6.0, 2.8, 100, "cup (100g)", 100),
        ("Activia Yogurt Drink 250ml", 78, 14.5, 2.2, 1.2, 250, "botol (250ml)", 250),
        ("Yakult Original 65ml", 77, 18.5, 1.2, 0.2, 65, "botol (65ml)", 65),
        ("Yakult ACE 65ml", 74, 18.0, 1.2, 0.2, 65, "botol (65ml)", 65),
        ("Biokul Yogurt Drink 250ml", 75, 13.8, 2.0, 1.2, 250, "botol (250ml)", 250),
        ("Yummy Yogurt Drink 200ml", 80, 14.0, 2.0, 1.5, 200, "botol (200ml)", 200)
    ]
    for name, cal, carb, prot, fat, serving, unit, eq in yogurt_items:
        tags = ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]
        if "Strawberry" in name or "Blueberry" in name:
            tags.append("NO_FRUIT")
        food_items.append({
            "name": name,
            "calorie_per_100g": cal,
            "carb_g": carb,
            "protein_g": prot,
            "fat_g": fat,
            "default_serving_g": float(serving),
            "source": "local",
            "is_custom": 0,
            "tags": tags,
            "portions": [
                {"unit_label": unit, "grams_equivalent": float(eq)},
                {"unit_label": "porsi (100g)", "grams_equivalent": 100.0}
            ]
        })

    # 17.4 Teh RTD (17 items)
    teh_items = [
        ("Teh Botol Sosro Original 330ml", 36, 9.0, 0.0, 0.0, 330, "botol (330ml)", 330),
        ("Teh Botol Sosro 1L", 36, 9.0, 0.0, 0.0, 330, "porsi (330ml)", 330),
        ("Teh Pucuk Harum Original 350ml", 34, 8.5, 0.0, 0.0, 350, "botol (350ml)", 350),
        ("Teh Pucuk Harum Less Sugar 350ml", 20, 5.0, 0.0, 0.0, 350, "botol (350ml)", 350),
        ("Frestea Original 350ml", 35, 8.8, 0.0, 0.0, 350, "botol (350ml)", 350),
        ("Frestea Green", 30, 7.5, 0.0, 0.0, 350, "botol (350ml)", 350),
        ("Frestea Apel", 38, 9.5, 0.0, 0.0, 350, "botol (350ml)", 350),
        ("Nu Green Tea Original 330ml", 32, 8.0, 0.0, 0.0, 330, "botol (330ml)", 330),
        ("Nu Green Tea Madu 330ml", 35, 8.7, 0.0, 0.0, 330, "botol (330ml)", 330),
        ("Ichitan Thai Tea Original 310ml", 58, 11.0, 1.0, 1.2, 310, "botol (310ml)", 310),
        ("Ichitan Milk Tea 310ml", 58, 11.0, 1.0, 1.2, 310, "botol (310ml)", 310),
        ("Teh Gelas Original 300ml", 35, 8.8, 0.0, 0.0, 300, "gelas (300ml)", 300),
        ("Teh Javana 350ml", 34, 8.5, 0.0, 0.0, 350, "botol (350ml)", 350),
        ("Pokka Teh Hijau 300ml", 0, 0.0, 0.0, 0.0, 300, "botol (300ml)", 300),
        ("Pokka Milk Tea 300ml", 60, 11.2, 1.0, 1.2, 300, "botol (300ml)", 300),
        ("Joy Tea Green 330ml", 30, 7.5, 0.0, 0.0, 330, "botol (330ml)", 330),
        ("Tekita Teh 350ml", 34, 8.5, 0.0, 0.0, 350, "botol (350ml)", 350)
    ]
    for name, cal, carb, prot, fat, serving, unit, eq in teh_items:
        tags = ["vegetarian", "vegan"]
        if "Milk" in name or "Thai" in name:
            tags = ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]
        if "Apel" in name:
            tags.append("NO_FRUIT")
        food_items.append({
            "name": name,
            "calorie_per_100g": cal,
            "carb_g": carb,
            "protein_g": prot,
            "fat_g": fat,
            "default_serving_g": float(serving),
            "source": "local",
            "is_custom": 0,
            "tags": tags,
            "portions": [
                {"unit_label": unit, "grams_equivalent": float(eq)},
                {"unit_label": "porsi (100g)", "grams_equivalent": 100.0}
            ]
        })

    # 17.5 Minuman Buah & Juice (15 items)
    juice_items = [
        ("Buavita Jeruk 250ml", 45, 11.0, 0.2, 0.0, 250, "kotak (250ml)", 250),
        ("Buavita Mangga 250ml", 52, 12.8, 0.2, 0.0, 250, "kotak (250ml)", 250),
        ("Buavita Guava 250ml", 48, 11.8, 0.2, 0.0, 250, "kotak (250ml)", 250),
        ("Minute Maid Pulpy Orange 350ml", 42, 10.5, 0.1, 0.0, 350, "botol (350ml)", 350),
        ("Minute Maid Pulpy Grape 350ml", 45, 11.2, 0.1, 0.0, 350, "botol (350ml)", 350),
        ("Minute Maid Nutriboost 300ml", 60, 12.0, 1.0, 0.8, 300, "botol (300ml)", 300),
        ("Twister Orange 350ml", 44, 11.0, 0.1, 0.0, 350, "botol (350ml)", 350),
        ("Capri-Sun Orange 200ml", 38, 9.2, 0.1, 0.0, 200, "sachet (200ml)", 200),
        ("Capri-Sun Tropical 200ml", 40, 9.8, 0.1, 0.0, 200, "sachet (200ml)", 200),
        ("ABC Juice Jeruk 250ml", 46, 11.2, 0.2, 0.0, 250, "kotak (250ml)", 250),
        ("ABC Juice Mangga 250ml", 54, 13.2, 0.2, 0.0, 250, "kotak (250ml)", 250),
        ("Pokka Juice Apple 300ml", 44, 11.0, 0.1, 0.0, 300, "botol (300ml)", 300),
        ("Pokka Juice Grape 300ml", 46, 11.5, 0.1, 0.0, 300, "botol (300ml)", 300),
        ("Jus Alpukat Kemasan 250ml", 78, 12.0, 1.0, 3.2, 250, "botol (250ml)", 250),
        ("Sari Buah Jambu Biji 250ml", 48, 11.8, 0.2, 0.0, 250, "botol (250ml)", 250)
    ]
    for name, cal, carb, prot, fat, serving, unit, eq in juice_items:
        tags = ["NO_FRUIT", "PREF_FRUIT"]
        if "Nutriboost" in name:
            tags.extend(["ALLERGY_LACTOSE", "no-dairy", "vegetarian"])
        else:
            tags.extend(["vegetarian", "vegan"])
        food_items.append({
            "name": name,
            "calorie_per_100g": cal,
            "carb_g": carb,
            "protein_g": prot,
            "fat_g": fat,
            "default_serving_g": float(serving),
            "source": "local",
            "is_custom": 0,
            "tags": tags,
            "portions": [
                {"unit_label": unit, "grams_equivalent": float(eq)},
                {"unit_label": "porsi (100g)", "grams_equivalent": 100.0}
            ]
        })

    # 17.6 Isotonik & Energi (18 items)
    energy_items = [
        ("Pocari Sweat 330ml", 25, 6.2, 0.0, 0.0, 330, "kaleng (330ml)", 330),
        ("Pocari Sweat 500ml", 25, 6.2, 0.0, 0.0, 500, "botol (500ml)", 500),
        ("Pocari Sweat 1L", 25, 6.2, 0.0, 0.0, 330, "porsi (330ml)", 330),
        ("Hydro Coco Original 310ml", 22, 5.5, 0.0, 0.0, 310, "kotak (310ml)", 310),
        ("Hydro Coco 500ml", 22, 5.5, 0.0, 0.0, 500, "botol (500ml)", 500),
        ("Mizone Active Lemon 500ml", 17, 4.2, 0.0, 0.0, 500, "botol (500ml)", 500),
        ("Mizone Orange Lime 500ml", 17, 4.2, 0.0, 0.0, 500, "botol (500ml)", 500),
        ("Mizone Passion Fruit 500ml", 17, 4.2, 0.0, 0.0, 500, "botol (500ml)", 500),
        ("Gatorade Lemon 500ml", 24, 6.0, 0.0, 0.0, 500, "botol (500ml)", 500),
        ("Gatorade Orange 500ml", 24, 6.0, 0.0, 0.0, 500, "botol (500ml)", 500),
        ("Aquarius 500ml", 19, 4.8, 0.0, 0.0, 500, "botol (500ml)", 500),
        ("Extra Joss RTD 150ml", 3, 0.6, 0.1, 0.0, 150, "botol (150ml)", 150),
        ("Kratingdaeng 150ml", 70, 17.5, 0.3, 0.0, 150, "botol (150ml)", 150),
        ("M-150 150ml", 72, 18.0, 0.2, 0.0, 150, "botol (150ml)", 150),
        ("Kuku Bima RTD 150ml", 60, 15.0, 0.2, 0.0, 150, "botol (150ml)", 150),
        ("Sting Energy Strawberry 330ml", 58, 14.5, 0.0, 0.0, 330, "botol (330ml)", 330),
        ("Sting Energy Passion Fruit 330ml", 58, 14.5, 0.0, 0.0, 330, "botol (330ml)", 330),
        ("Red Bull 250ml", 45, 11.0, 0.3, 0.0, 250, "kaleng (250ml)", 250),
        ("Cobra Energy 150ml", 65, 16.0, 0.2, 0.0, 150, "botol (150ml)", 150)
    ]
    for name, cal, carb, prot, fat, serving, unit, eq in energy_items:
        tags = ["vegetarian", "vegan"]
        if "Strawberry" in name:
            tags.append("NO_FRUIT")
        food_items.append({
            "name": name,
            "calorie_per_100g": cal,
            "carb_g": carb,
            "protein_g": prot,
            "fat_g": fat,
            "default_serving_g": float(serving),
            "source": "local",
            "is_custom": 0,
            "tags": tags,
            "portions": [
                {"unit_label": unit, "grams_equivalent": float(eq)},
                {"unit_label": "porsi (100g)", "grams_equivalent": 100.0}
            ]
        })

    # 17.7 Air & Sparkling (12 items)
    air_items = [
        ("Aqua 330ml", 0, 0.0, 0.0, 0.0, 330, "botol (330ml)", 330),
        ("Aqua 600ml", 0, 0.0, 0.0, 0.0, 600, "botol (600ml)", 600),
        ("Aqua 1.5L", 0, 0.0, 0.0, 0.0, 600, "porsi (600ml)", 600),
        ("Le Minerale 600ml", 0, 0.0, 0.0, 0.0, 600, "botol (600ml)", 600),
        ("Club 600ml", 0, 0.0, 0.0, 0.0, 600, "botol (600ml)", 600),
        ("Cleo 550ml", 0, 0.0, 0.0, 0.0, 550, "botol (550ml)", 550),
        ("Prima 600ml", 0, 0.0, 0.0, 0.0, 600, "botol (600ml)", 600),
        ("Vit 600ml", 0, 0.0, 0.0, 0.0, 600, "botol (600ml)", 600),
        ("Ades 500ml", 0, 0.0, 0.0, 0.0, 500, "botol (500ml)", 500),
        ("Sprite 330ml", 40, 10.0, 0.0, 0.0, 330, "kaleng (330ml)", 330),
        ("Sprite 500ml", 40, 10.0, 0.0, 0.0, 500, "botol (500ml)", 500),
        ("Coca Cola Original 330ml", 42, 10.6, 0.0, 0.0, 330, "kaleng (330ml)", 330),
        ("Coca Cola 500ml", 42, 10.6, 0.0, 0.0, 500, "botol (500ml)", 500),
        ("Fanta Strawberry 330ml", 45, 11.2, 0.0, 0.0, 330, "kaleng (330ml)", 330),
        ("Fanta Orange 330ml", 45, 11.2, 0.0, 0.0, 330, "kaleng (330ml)", 330),
        ("Pepsi 330ml", 41, 10.3, 0.0, 0.0, 330, "kaleng (330ml)", 330),
        ("7Up 330ml", 38, 9.5, 0.0, 0.0, 330, "kaleng (330ml)", 330),
        ("Schweppes Soda Water 330ml", 0, 0.0, 0.0, 0.0, 330, "kaleng (330ml)", 330),
        ("Schweppes Tonic Water 330ml", 37, 9.0, 0.0, 0.0, 330, "kaleng (330ml)", 330)
    ]
    for name, cal, carb, prot, fat, serving, unit, eq in air_items:
        tags = ["vegetarian", "vegan"]
        if "Strawberry" in name:
            tags.append("NO_FRUIT")
        food_items.append({
            "name": name,
            "calorie_per_100g": cal,
            "carb_g": carb,
            "protein_g": prot,
            "fat_g": fat,
            "default_serving_g": float(serving),
            "source": "local",
            "is_custom": 0,
            "tags": tags,
            "portions": [
                {"unit_label": unit, "grams_equivalent": float(eq)},
                {"unit_label": "porsi (100g)", "grams_equivalent": 100.0}
            ]
        })

    # 17.8 Minuman Coklat & Malt (10 items)
    malt_items = [
        ("Milo Fuze 240ml", 68, 12.0, 1.8, 1.5, 240, "kaleng (240ml)", 240),
        ("Milo Nugget 25g", 480, 62.0, 6.0, 22.0, 25, "1 bungkus", 25),
        ("Milo Nugget Sharing Pack", 480, 62.0, 6.0, 22.0, 25, "porsi (25g)", 25),
        ("Milo Activ-Go botol 200ml", 70, 11.5, 2.0, 1.6, 200, "botol (200ml)", 200),
        ("Ovomaltine RTD 200ml", 78, 12.2, 2.2, 2.2, 200, "kotak (200ml)", 200),
        ("Nesquik Coklat 200ml", 74, 11.8, 3.2, 1.5, 200, "kotak (200ml)", 200),
        ("Ceres Chocolate Drink 200ml", 80, 12.5, 2.0, 2.2, 200, "kotak (200ml)", 200),
        ("Van Houten Drink 200ml", 76, 12.0, 2.4, 1.8, 200, "kotak (200ml)", 200),
        ("Cadbury Chocolate Drink 200ml", 82, 12.8, 2.2, 2.4, 200, "kotak (200ml)", 200),
        ("Fitbar Drink 200ml", 68, 11.8, 2.0, 1.4, 200, "kotak (200ml)", 200)
    ]
    for name, cal, carb, prot, fat, serving, unit, eq in malt_items:
        # All these chocolate drinks contain milk/dairy
        food_items.append({
            "name": name,
            "calorie_per_100g": cal,
            "carb_g": carb,
            "protein_g": prot,
            "fat_g": fat,
            "default_serving_g": float(serving),
            "source": "local",
            "is_custom": 0,
            "tags": ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"],
            "portions": [
                {"unit_label": unit, "grams_equivalent": float(eq)},
                {"unit_label": "porsi (100g)", "grams_equivalent": 100.0}
            ]
        })

    # 17.9 Minuman Kekinian Kemasan (6 items)
    kekinian_items = [
        ("Oat Side Oat Milk 250ml", 65, 8.2, 1.2, 3.0, 250, "kotak (250ml)", 250, ["vegetarian", "vegan"]),
        ("Oatly Oat Milk 250ml", 60, 7.8, 1.0, 2.8, 250, "kotak (250ml)", 250, ["vegetarian", "vegan"]),
        ("Boba Drink Kemasan 350ml", 95, 20.0, 1.2, 1.5, 350, "botol (350ml)", 350, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Ichitan Milk Tea Original 310ml", 58, 11.0, 1.0, 1.2, 310, "botol (310ml)", 310, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Calpico Original 350ml", 48, 11.2, 0.5, 0.1, 350, "botol (350ml)", 350, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Cimory Yogurt Drink 250ml", 80, 14.0, 2.0, 1.5, 250, "botol (250ml)", 250, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"])
    ]
    for name, cal, carb, prot, fat, serving, unit, eq, tags in kekinian_items:
        food_items.append({
            "name": name,
            "calorie_per_100g": cal,
            "carb_g": carb,
            "protein_g": prot,
            "fat_g": fat,
            "default_serving_g": float(serving),
            "source": "local",
            "is_custom": 0,
            "tags": tags,
            "portions": [
                {"unit_label": unit, "grams_equivalent": float(eq)},
                {"unit_label": "porsi (100g)", "grams_equivalent": 100.0}
            ]
        })

    # 17.10 Minuman Tradisional & Herbal (10 items)
    tradisional_items = [
        ("Marimas Jeruk", 45, 11.0, 0.0, 0.0, 200, "sachet diseduh", 200, ["NO_FRUIT"]),
        ("Marimas Mangga", 45, 11.0, 0.0, 0.0, 200, "sachet diseduh", 200, ["NO_FRUIT"]),
        ("Nutrisari Jeruk", 48, 11.8, 0.0, 0.0, 200, "sachet", 200, ["NO_FRUIT"]),
        ("Nutrisari Mangga", 48, 11.8, 0.0, 0.0, 200, "sachet", 200, ["NO_FRUIT"]),
        ("Nutrisari Jambu", 48, 11.8, 0.0, 0.0, 200, "sachet", 200, ["NO_FRUIT"]),
        ("Tolak Angin Cair", 160, 40.0, 0.0, 0.0, 15, "sachet", 15, ["vegetarian"]),
        ("Lasegar", 0, 0.0, 0.0, 0.0, 150, "sachet", 150, ["vegetarian", "vegan"]),
        ("Wedang Uwuh Kemasan", 40, 10.0, 0.1, 0.0, 200, "sachet diseduh", 200, ["vegetarian", "vegan"]),
        ("Jahe Wangi", 42, 10.5, 0.1, 0.0, 200, "sachet diseduh", 200, ["vegetarian", "vegan"]),
        ("ABC Squash Delight Jeruk", 45, 11.0, 0.0, 0.0, 200, "porsi", 200, ["NO_FRUIT"])
    ]
    for name, cal, carb, prot, fat, serving, unit, eq, tags in tradisional_items:
        full_tags = tags + ["vegetarian"] if "vegetarian" not in tags else tags
        food_items.append({
            "name": name,
            "calorie_per_100g": cal,
            "carb_g": carb,
            "protein_g": prot,
            "fat_g": fat,
            "default_serving_g": float(serving),
            "source": "local",
            "is_custom": 0,
            "tags": full_tags,
            "portions": [
                {"unit_label": unit, "grams_equivalent": float(eq)},
                {"unit_label": "porsi (100g)", "grams_equivalent": 100.0}
            ]
        })

    # 17.11 Suplemen (6 items)
    suplemen_items = [
        ("Whey Protein", 390, 8.0, 80.0, 4.0, 30, "scoop", 30, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Susu Protein", 80, 4.5, 10.0, 2.0, 250, "gelas", 250, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Protein Bar", 380, 35.0, 30.0, 12.0, 60, "buah", 60, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"]),
        ("Granola Bar", 400, 55.0, 8.0, 15.0, 40, "buah", 40, ["vegetarian"]),
        ("Madu", 304, 82.0, 0.3, 0.0, 21, "sdm", 21, ["vegetarian"]),
        ("Herbalife Shake", 360, 42.0, 38.0, 4.5, 200, "sajian", 200, ["ALLERGY_LACTOSE", "no-dairy", "vegetarian"])
    ]
    for name, cal, carb, prot, fat, serving, unit, eq, tags in suplemen_items:
        food_items.append({
            "name": name,
            "calorie_per_100g": cal,
            "carb_g": carb,
            "protein_g": prot,
            "fat_g": fat,
            "default_serving_g": float(serving),
            "source": "local",
            "is_custom": 0,
            "tags": tags,
            "portions": [
                {"unit_label": unit, "grams_equivalent": float(eq)},
                {"unit_label": "porsi (100g)", "grams_equivalent": 100.0}
            ]
        })

    print(f"Total compiled local seed food items: {len(food_items)}")

    # Ensure output dir exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(OUTPUT_FILE, mode="w", encoding="utf-8") as f:
        json.dump(food_items, f, indent=2, ensure_ascii=False)

    print(f"Successfully generated {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
