from pathlib import Path
import json

root = Path(r"E:/ocentra-games/packages/asset-editor/Resources/GameMode/CardGames")
images_root = root / "Images"
cards_root = root / "Cards"
tiles_root = root / "Tiles"
decks_root = root / "Decks"

image_files = [p for p in images_root.rglob("*") if p.is_file() and p.suffix.lower() == ".png"]
usage = {p.resolve(): {"cards": [], "tiles": []} for p in image_files}
missing_refs = {"cards": [], "tiles": []}


def parse_asset(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def rel_repo(path: Path) -> str:
    return str(path).replace("E:/ocentra-games/", "").replace("\\", "/")


asset_editor_root = Path(r"E:/ocentra-games/packages/asset-editor")

for p in cards_root.rglob("*.asset"):
    obj = parse_asset(p)
    if not obj:
        continue
    data = obj.get("data") or {}
    ip = data.get("imagePath")
    if isinstance(ip, str) and ip.startswith("Resources/"):
        abs_image = (asset_editor_root / ip).resolve()
        rel = rel_repo(p)
        if abs_image in usage:
            usage[abs_image]["cards"].append(rel)
        else:
            missing_refs["cards"].append({"asset": rel, "imagePath": ip})

for p in tiles_root.rglob("*.asset"):
    obj = parse_asset(p)
    if not obj:
        continue
    data = obj.get("data") or {}
    ip = data.get("imagePath")
    if isinstance(ip, str) and ip.startswith("Resources/"):
        abs_image = (asset_editor_root / ip).resolve()
        rel = rel_repo(p)
        if abs_image in usage:
            usage[abs_image]["tiles"].append(rel)
        else:
            missing_refs["tiles"].append({"asset": rel, "imagePath": ip})

unused = []
for img, refs in usage.items():
    if not refs["cards"] and not refs["tiles"]:
        unused.append(img)

folder_stats = {}
for img in image_files:
    rel_folder = str(img.parent.relative_to(images_root)).replace("\\", "/") or "."
    stats = folder_stats.setdefault(rel_folder, {"total": 0, "used": 0, "unused": 0})
    stats["total"] += 1
    refs = usage[img.resolve()]
    if refs["cards"] or refs["tiles"]:
        stats["used"] += 1
    else:
        stats["unused"] += 1

deck_sources = set()
back_sources = set()
for p in decks_root.rglob("*.asset"):
    obj = parse_asset(p)
    if not obj:
        continue
    data = obj.get("data") or {}
    source = data.get("imageSourceFolderPath")
    back = data.get("backCardSourceFolderPath")
    if isinstance(source, str):
        deck_sources.add(source)
    if isinstance(back, str):
        back_sources.add(back)

unused_samples = []
for img in unused[:300]:
    rel_img = "Resources/GameMode/CardGames/Images/" + str(img.relative_to(images_root)).replace("\\", "/")
    rel_folder = "Resources/GameMode/CardGames/Images/" + str(img.parent.relative_to(images_root)).replace("\\", "/")
    reason = "unmapped_or_not_referenced"
    if "/Extras/" in rel_img or rel_folder.endswith("/Extras"):
        reason = "back_or_extra_image"
    elif rel_folder in back_sources:
        reason = "deck_back_source_folder"
    elif rel_folder in deck_sources:
        reason = "in_deck_source_folder_but_not_referenced_by_imagePath"
    unused_samples.append({"image": rel_img, "reason": reason})

report = {
    "totals": {
        "images": len(image_files),
        "used_by_cards_or_tiles": len(image_files) - len(unused),
        "unused": len(unused),
        "card_imagePath_missing_targets": len(missing_refs["cards"]),
        "tile_imagePath_missing_targets": len(missing_refs["tiles"]),
    },
    "folder_stats": dict(sorted(folder_stats.items(), key=lambda kv: (-kv[1]["unused"], kv[0]))),
    "unused_samples": unused_samples,
    "missing_ref_samples": {
        "cards": missing_refs["cards"][:40],
        "tiles": missing_refs["tiles"][:40],
    },
}

out = Path(r"E:/ocentra-games/packages/game-asset-domain/image-usage-audit.json")
out.write_text(json.dumps(report, indent=2), encoding="utf-8")

usage_details = {}
for img, refs in usage.items():
    rel_img = "Resources/GameMode/CardGames/Images/" + str(Path(img).relative_to(images_root)).replace("\\", "/")
    usage_details[rel_img] = {
        "cards": refs["cards"],
        "tiles": refs["tiles"],
        "used": bool(refs["cards"] or refs["tiles"]),
    }

details_out = Path(r"E:/ocentra-games/packages/game-asset-domain/image-usage-by-image.json")
details_out.write_text(json.dumps(usage_details, indent=2), encoding="utf-8")
print(json.dumps(report["totals"], indent=2))
print("report:", out)
print("details:", details_out)

