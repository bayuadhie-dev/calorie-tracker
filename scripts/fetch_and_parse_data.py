import os
import urllib.request
import csv
import json

CSV_URL = "https://raw.githubusercontent.com/samuelnaibaho2005/Clustering-makanan-dan-minuman-berdasarkan-profil-nutrisi/main/nutrition.csv"
OUTPUT_DIR = "/home/superadmin/Documents/APK project/calorie-tracker/src/db/seed"
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "food_items_tkpi.json")

def download_csv(url):
    print(f"Downloading CSV from {url}...")
    temp_file, _ = urllib.request.urlretrieve(url)
    return temp_file

def parse_float(val):
    if not val:
        return 0.0
    try:
        # Handle commas instead of periods
        val_clean = val.replace(",", ".").strip()
        return float(val_clean)
    except ValueError:
        return 0.0

def process_row(row):
    # Columns: id, calories, proteins, fat, carbohydrate, name, image
    name = row.get("name", "").strip()
    if not name:
        return None

    calorie = parse_float(row.get("calories", "0"))
    protein = parse_float(row.get("proteins", "0"))
    fat = parse_float(row.get("fat", "0"))
    carb = parse_float(row.get("carbohydrate", "0"))
    image = row.get("image", "").strip()

    name_lower = name.lower()
    tags = []

    # 1. Dietary restrictions heuristics
    # Beef
    if "sapi" in name_lower or "beef" in name_lower:
        tags.append("no-beef")

    # Pork
    if any(x in name_lower for x in ["babi", "pork", "ham", "bacon", "celeng"]):
        tags.append("no-pork")

    # Seafood
    if any(x in name_lower for x in ["udang", "cumi", "kepiting", "lobster", "kerang", "tiram", "gurita", "seafood"]):
        tags.append("no-seafood")

    # Nuts
    if "kacang" in name_lower and not any(x in name_lower for x in ["panjang", "buncis", "kapri", "kedelai"]):
        tags.append("no-nuts")

    # Dairy
    if any(x in name_lower for x in ["susu", "keju", "mentega", "butter", "yoghurt", "cream", "krim"]):
        tags.append("no-dairy")

    # Vegetarian / Vegan check
    animal_ingredients = [
        "ayam", "sapi", "babi", "ikan", "udang", "cumi", "kepiting", "daging", "bebek",
        "kambing", "domba", "rebon", "teri", "kaldu", "tiram", "kerang", "gurita",
        "hayam", "hewan", "gelatin", "tetelan", "jeroan", "paru", "babat", "usus", "buntut"
    ]
    has_meat = any(x in name_lower for x in animal_ingredients)

    egg_dairy_ingredients = [
        "telur", "susu", "keju", "mentega", "butter", "yoghurt", "cream", "krim", "madu", "telor"
    ]
    has_egg_dairy = any(x in name_lower for x in egg_dairy_ingredients)

    if not has_meat and not has_egg_dairy:
        tags.append("vegan")
        tags.append("vegetarian")
    elif not has_meat:
        tags.append("vegetarian")

    # 2. Portion units mapping
    portions = []

    # Nasi
    if "nasi" in name_lower:
        if any(x in name_lower for x in ["goreng", "uduk", "kuning", "kebuli", "liwet"]):
            portions.append({"unit_label": "piring", "grams_equivalent": 250.0})
        else:
            portions.append({"unit_label": "centong", "grams_equivalent": 100.0})
            portions.append({"unit_label": "piring", "grams_equivalent": 200.0})

    # Telur
    elif "telur" in name_lower or "telor" in name_lower:
        if any(x in name_lower for x in ["dadar", "orak", "scramble"]):
            portions.append({"unit_label": "butir", "grams_equivalent": 65.0})
        else:
            portions.append({"unit_label": "butir", "grams_equivalent": 55.0})

    # Ayam / Bebek
    elif any(x in name_lower for x in ["ayam", "bebek"]):
        portions.append({"unit_label": "potong", "grams_equivalent": 80.0})

    # Tahu / Tempe
    elif "tahu" in name_lower or "tempe" in name_lower:
        portions.append({"unit_label": "potong", "grams_equivalent": 40.0})

    # Bakso
    elif "bakso" in name_lower or "baso" in name_lower:
        portions.append({"unit_label": "butir", "grams_equivalent": 20.0})
        portions.append({"unit_label": "mangkok", "grams_equivalent": 250.0})

    # Mie / Bihun / Kwetiau / Ramen / Pasta
    elif any(x in name_lower for x in ["mie", "bihun", "kwetiau", "ramen", "pasta"]):
        portions.append({"unit_label": "mangkok", "grams_equivalent": 200.0})

    # Roti
    elif "roti" in name_lower:
        portions.append({"unit_label": "lembar", "grams_equivalent": 30.0})

    # Buah-buahan
    elif any(x in name_lower for x in ["pisang", "apel", "jeruk", "mangga", "pepaya", "semangka", "melon", "jambu"]):
        portions.append({"unit_label": "buah", "grams_equivalent": 100.0})

    # Minuman
    elif any(x in name_lower for x in ["teh", "kopi", "susu", "jus", "sirup"]):
        portions.append({"unit_label": "gelas", "grams_equivalent": 200.0})
        portions.append({"unit_label": "cangkir", "grams_equivalent": 150.0})

    # Default serving is always 100g
    portions.append({"unit_label": "porsi (100g)", "grams_equivalent": 100.0})

    return {
        "name": name,
        "calorie_per_100g": calorie,
        "carb_g": carb,
        "protein_g": protein,
        "fat_g": fat,
        "source": "tkpi",
        "is_custom": 0,
        "image": image if image else None,
        "tags": tags,
        "portions": portions
    }

def main():
    temp_csv_path = download_csv(CSV_URL)
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    food_items = []
    print("Parsing CSV...")
    with open(temp_csv_path, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            processed = process_row(row)
            if processed:
                food_items.append(processed)

    print(f"Parsed {len(food_items)} food items successfully.")

    with open(OUTPUT_FILE, mode="w", encoding="utf-8") as f:
        json.dump(food_items, f, indent=2, ensure_ascii=False)

    print(f"Successfully saved to {OUTPUT_FILE}")
    
    # Clean up temp file
    try:
        os.remove(temp_csv_path)
    except OSError:
        pass

if __name__ == "__main__":
    main()
