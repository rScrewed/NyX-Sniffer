#!/usr/bin/env python3

import argparse
import hashlib
import json
import math
import os
import re
import shutil
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

CATEGORIES = {
    "people_selfies": [
        "a selfie of a person",
        "a close-up portrait photo of a person's face",
        "a group photo of friends",
        "a real photo of a person posing",
        "a mirror selfie",
        "a photo of a child or a baby",
    ],
    "documents_ids": [
        "a photo of an ID card or driver's license",
        "a photo of a passport",
        "an open passport page with a photo and stamps",
        "a scanned document or paperwork",
        "a photo of a receipt or invoice",
        "a bank statement, bill or official letter",
        "a photo of a handwritten note or paper",
        "a screenshot of a form or a PDF",
    ],
    "chat_screenshots": [
        "a screenshot of a chat conversation",
        "a screenshot of Discord messages",
        "a screenshot of text messages on a phone",
        "a screenshot of a WhatsApp or Telegram conversation",
        "a screenshot of a social media post or comments",
    ],
    "app_screenshots": [
        "a screenshot of a phone home screen or settings",
        "a screenshot of a computer desktop",
        "a screenshot of a website",
        "a screenshot of a mobile app interface",
        "a screenshot of an error message or dialog box",
    ],
    "gaming": [
        "a screenshot of a video game",
        "a 3D rendered video game scene",
        "a screenshot of a first-person shooter game",
        "a car in a racing video game",
        "a screenshot of Minecraft, Roblox or Fortnite",
        "gameplay footage with a game HUD, health bar or minimap",
        "a screenshot of a game menu or inventory",
    ],
    "locations_outdoor": [
        "a real photo of a street or neighbourhood",
        "a real photo of the outside of a house or apartment building",
        "a real photo of a city skyline or famous landmark",
        "a map or GPS location screenshot",
        "a view out of a window",
        "a real photo of a store front, road sign or street sign",
    ],
    "home_interiors": [
        "a real photo of a bedroom",
        "a real photo of a living room or kitchen",
        "a real photo of a room interior with furniture",
        "a real photo of an office or classroom",
        "a real photo of a bathroom",
    ],
    "vehicles": [
        "a real photo of a car on a road",
        "a real close-up photo of a car license plate",
        "a real photo of a motorcycle or bicycle",
        "a real photo of a van, truck or delivery vehicle",
        "a real photo of a train, bus, boat or airplane",
        "a real photo of the inside of a car",
    ],
    "animals": [
        "a photo of a dog",
        "a photo of a cat",
        "a photo of a wild animal",
        "a photo of a pet bird, fish or reptile",
        "a photo of a horse or farm animal",
    ],
    "tech_hardware": [
        "a photo of a computer or gaming PC setup",
        "a photo of a smartphone or tablet",
        "a photo of computer hardware, a graphics card or a circuit board",
        "a photo of a keyboard, mouse or headphones",
        "a photo of a camera, drone or electronic gadget",
        "a photo of a server rack or network cables",
    ],
    "code_terminal": [
        "source code on a screen",
        "a terminal window with command line text",
        "a screenshot of a programming editor",
        "a hacking tool or network scan output on a dark screen",
    ],
    "money_finance": [
        "a photo of cash money",
        "a photo of a credit card or debit card",
        "a cryptocurrency wallet or trading chart screenshot",
        "a payment or bank transaction confirmation screenshot",
        "a photo of gold, jewelry or a luxury watch",
    ],
    "weapons": [
        "a photo of a gun or firearm",
        "a photo of a knife or blade",
        "a photo of ammunition or a rifle",
        "a photo of a person holding a weapon",
    ],
    "drugs_alcohol": [
        "a photo of illegal drugs or pills",
        "a photo of cannabis or marijuana",
        "a photo of drug paraphernalia, a bong or a vape",
        "a photo of bottles of alcohol or beer",
    ],
    "adult_content": [
        "a sexually explicit photo",
        "a nude or lingerie photo",
        "an erotic or pornographic image",
        "a hentai or explicit anime illustration",
    ],
    "memes_humor": [
        "a meme with text on it",
        "a funny reaction image",
        "a screenshot of a tweet or a joke post",
        "a sticker, emoji or reaction gif",
        "an image macro with top and bottom caption text",
    ],
    "anime_art": [
        "an anime or manga illustration",
        "a cartoon character",
        "digital art or a drawing",
        "a painting or fan art",
        "a pixel art image",
    ],
    "food_drink": [
        "a photo of a meal or plate of food",
        "a photo of pizza, a burger or fast food",
        "a photo of a drink, coffee or cocktail",
        "a photo of baked goods or dessert",
    ],
    "nature_scenery": [
        "a photo of a landscape with mountains or trees",
        "a photo of a beach, ocean or lake",
        "a photo of the sky, clouds or a sunset",
        "a photo of flowers or plants",
    ],
    "fashion_clothing": [
        "a photo of clothing or an outfit",
        "a photo of sneakers or shoes",
        "a photo of a bag, hat or accessories",
        "a photo of makeup or cosmetics",
    ],
    "sports_fitness": [
        "a photo of a sports match or stadium",
        "a photo of a person working out at a gym",
        "a photo of sports equipment",
        "a photo of a person running, swimming or hiking",
    ],
    "media_entertainment": [
        "a movie poster",
        "an album cover or a music artist",
        "a screenshot from a movie or TV show",
        "a photo of a concert or a musical instrument",
        "a book cover",
    ],
    "text_graphics": [
        "a logo or brand graphic",
        "a quote written on a plain background",
        "an infographic, chart or diagram",
        "a flyer, banner or advertisement design",
    ],
}

MEDIUMS = {
    "photograph": "a real photograph taken with a camera",
    "video_game": "a screenshot of a video game",
    "screenshot": "a screenshot of a phone or computer screen",
    "meme": "a meme or image with caption text",
    "illustration": "an anime, cartoon or digital illustration",
    "3d_render": "a 3D render or computer graphic",
    "document_scan": "a scan or photo of a paper document",
}

VOCAB = """
a dog|a cat|a horse|a bird|a fish|a snake or lizard|a wild animal|an insect|a farm animal
a car|a sports car|a truck|a motorcycle|a bicycle|a boat|an airplane|a train|a bus|a tractor
a house|an apartment building|a skyscraper|a bridge|a church|a castle|a school building|a shop|a restaurant|a hotel
a street at night|a highway|a parking lot|a city skyline|a village|a farm|a construction site|a factory|a harbor
a mountain|a forest|a beach|a desert|a river|a waterfall|a snowy landscape|a sunset|a night sky with stars|a garden|a field of flowers
a kitchen|a bedroom|a living room|a bathroom|an office|a classroom|a garage|a basement|a hospital room|a gym
a pizza|a burger|a steak|sushi|pasta|a salad|a cake|ice cream|coffee|beer|wine|a cocktail|fruit|vegetables|bread|candy
a smartphone|a laptop|a desktop computer|a gaming pc|a monitor|a keyboard|a game controller|a video game console|a graphics card|a circuit board|a router|a camera|a drone|a television|headphones|a smartwatch|a robot|a 3d printer|a server room
a guitar|a piano|a drum kit|a microphone|a concert|a dj setup|vinyl records
a football match|a basketball game|a soccer field|a tennis court|a boxing match|a swimming pool|a skate park|a ski slope|a bike ride|a martial arts fight|a golf course|a race track
a gun|a rifle|a knife|a sword|ammunition|a military vehicle|a soldier|a police officer|a police car|a fire truck|an explosion|a fire
cash money|a stack of dollar bills|gold bars|a credit card|a watch|a diamond ring|a necklace|a luxury handbag|a luxury car|a yacht|a mansion
a t-shirt|a hoodie|sneakers|a dress|a suit|a hat|sunglasses|a backpack|makeup|a hairstyle|a tattoo
a baby|a child|a family portrait|a wedding|a birthday party|a party with friends|a crowd of people|a graduation|a funeral|a protest
a man|a woman|a group of men|a couple|an elderly person|a person wearing a mask|a person in a costume|a cosplayer
a minecraft world|a first person shooter game|a racing game|a fighting game|a battle royale game|a strategy game|a role playing game|a sandbox game|a mobile game|a game character selection screen|a game leaderboard|a roblox game
an anime girl|an anime boy|a manga page|a cartoon|a comic book|a superhero|a pokemon|a video game character|a mascot|pixel art|a fantasy illustration|a sci-fi scene|a dragon|a monster
a meme|a tweet screenshot|a reddit post|a youtube video thumbnail|a tiktok video|an instagram post|a discord server|a livestream|a twitch stream|a music video|a movie scene|a tv show|a news article|a wikipedia page|a shopping website|an online store listing|a maps app
a map|a chart|a graph|a table of numbers|a diagram|a flowchart|a calendar|a presentation slide|an infographic|a logo|a poster|a sticker|a banner|a flag|a license plate|a street sign|a billboard|a barcode or qr code
a book|a textbook|handwriting|a receipt|a bank statement|an id card|a passport|a certificate|a contract|a resume|a shipping label|an invoice|a prescription|a boarding pass|a ticket
a bong|a vape|pills|a syringe|a joint|marijuana leaves|drug powder|bottles of alcohol|a cigarette|a lighter|a hookah
a toy|a lego set|a plush toy|a board game|playing cards|a skateboard|a balloon|a christmas tree|halloween decorations|fireworks
a doctor|a hospital|medicine|a wound|an x-ray|a gym workout|a diet meal|a pregnant belly|a dentist
a bitcoin chart|a stock market chart|a crypto wallet|a payment receipt|an online banking page|a paypal screenshot|a shipping package|a sneaker collection|a trading card
a text message conversation|a discord chat|a code editor|a terminal window|a hacking tool|a spreadsheet|a web browser|an error message|a login page|a settings menu|a windows desktop|a phone lock screen|a webcam video call|a zoom meeting
a sky view from an airplane|a hotel room|a beach resort|a tourist attraction|a museum|a statue|a monument|a bridge at night|a train station|an airport
a plant|a houseplant|a tree|a lawn|a cactus|a rose|a sunflower|a mushroom
a sofa|a bed|a desk|a chair|a fridge|a bookshelf|a lamp|a mirror|a window view|a door
a pile of trash|a messy room|a broken object|an accident|a flooded street|a snowstorm|a rainy street|a fog
""".replace("\n", "|").split("|")
VOCAB = sorted({v.strip() for v in VOCAB if v.strip()})

QUALITY = {
    "fast":     ("openai/clip-vit-base-patch32", 1),
    "balanced": ("openai/clip-vit-base-patch16", 3),
    "best":     ("openai/clip-vit-large-patch14", 4),
}

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif", ".tif", ".tiff", ".heic", ".avif"}
GRAY = (124, 116, 104)


def find_images(root: Path, skip: Path):
    out = []
    for dirpath, dirnames, filenames in os.walk(root):
        dp = Path(dirpath)
        if dp == skip or skip in dp.parents:
            dirnames[:] = []
            continue
        for name in filenames:
            if Path(name).suffix.lower() in IMAGE_EXTS:
                out.append(dp / name)
    out.sort()
    return out


def make_views(img, n):
    from PIL import Image

    w, h = img.size
    s = min(w, h)

    def letterbox(im):
        side = max(im.size)
        canvas = Image.new("RGB", (side, side), GRAY)
        canvas.paste(im, ((side - im.size[0]) // 2, (side - im.size[1]) // 2))
        return canvas

    def crop(x, y, size):
        return img.crop((x, y, x + size, y + size))

    views = [letterbox(img)]
    if n >= 2 and max(w, h) / s > 1.05:
        views.append(crop((w - s) // 2, (h - s) // 2, s))
    if n >= 3:
        if max(w, h) / s > 1.3:
            views.append(crop(0, 0, s))
            if n >= 4:
                views.append(crop(w - s, h - s, s))
        else:
            z = int(s * 0.7)
            views.append(crop((w - z) // 2, (h - z) // 2, z))
            if n >= 4:
                z = int(s * 0.5)
                views.append(crop((w - z) // 2, (h - z) // 2, z))
    return views


def load_views(args):
    from PIL import Image

    path, n = args
    try:
        img = Image.open(path)
        img.draft("RGB", (1024, 1024))
        img = img.convert("RGB")
        if max(img.size) > 1600:
            img.thumbnail((1600, 1600))
        return make_views(img, n)
    except Exception:
        return None


def as_tensor(out):
    return out if hasattr(out, "norm") else out.pooler_output


def pick_device(torch):
    if torch.cuda.is_available():
        return "cuda"
    if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def embed_texts(torch, model, processor, texts, device):
    embs = []
    for i in range(0, len(texts), 64):
        tok = processor(text=texts[i:i + 64], return_tensors="pt", padding=True, truncation=True).to(device)
        t = as_tensor(model.get_text_features(**tok))
        embs.append(t / t.norm(dim=-1, keepdim=True))
    return torch.cat(embs)


def class_scores(torch, img_embs, prompt_embs, groups, scale):
    logits = scale * img_embs @ prompt_embs.T
    cols = []
    for lo, hi in groups:
        cols.append(torch.logsumexp(logits[:, lo:hi], dim=1) - math.log(hi - lo))
    return torch.stack(cols, dim=1)


def kmeans(torch, x, k, iters=40, restarts=5, seed=0):
    g = torch.Generator().manual_seed(seed)
    best = None
    for _ in range(restarts):
        idx = [int(torch.randint(len(x), (1,), generator=g))]
        d = 1 - x @ x[idx[0]]
        for _ in range(k - 1):
            p = d.clamp(min=0) ** 2
            p = p / p.sum() if p.sum() > 0 else torch.ones_like(p) / len(p)
            nxt = int(torch.multinomial(p, 1, generator=g))
            idx.append(nxt)
            d = torch.minimum(d, 1 - x @ x[nxt])
        c = x[idx].clone()
        for _ in range(iters):
            assign = (x @ c.T).argmax(1)
            new = torch.zeros_like(c).index_add_(0, assign, x)
            counts = torch.bincount(assign, minlength=k)
            ok = counts > 0
            new[ok] = new[ok] / new[ok].norm(dim=1, keepdim=True)
            new[~ok] = c[~ok]
            done = torch.allclose(new, c, atol=1e-5)
            c = new
            if done:
                break
        assign = (x @ c.T).argmax(1)
        inertia = float((1 - (x * c[assign]).sum(1)).sum())
        if best is None or inertia < best[0]:
            best = (inertia, assign, c)
    return best[1], best[2]


def slug(text):
    t = re.sub(r"^(a|an)\s+", "", text.lower())
    return re.sub(r"[^a-z0-9]+", "_", t).strip("_") or "misc"


def discover_categories(torch, model, processor, device, embs, scale, min_cluster):
    n = len(embs)
    if n < 2 * min_cluster:
        return []
    k = max(2, min(30, int(round(math.sqrt(n) / 1.2)), n // min_cluster))
    assign, centroids = kmeans(torch, embs, k)

    prompts = ["a photo of " + v for v in VOCAB]
    vocab_embs = embed_texts(torch, model, processor, prompts, device).cpu()
    sims = scale * centroids @ vocab_embs.T

    merged = {}
    for ci in range(k):
        rows = (assign == ci).nonzero().flatten().tolist()
        if len(rows) < min_cluster:
            continue
        order = sims[ci].argsort(descending=True)[:3].tolist()
        top3 = [VOCAB[j] for j in order]
        name = "auto_" + slug(top3[0])
        if name in merged:
            merged[name][1].extend(rows)
        else:
            merged[name] = [top3, rows]
    return [(nm, v[0], v[1]) for nm, v in merged.items()]


def place(src: Path, dest: Path, copy: bool):
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() or dest.is_symlink():
        dest.unlink()
    if not copy:
        try:
            os.link(src, dest)
            return
        except OSError:
            pass
    shutil.copy2(src, dest)


def main():
    ap = argparse.ArgumentParser(description="Sort scan images into categories with CLIP.")
    ap.add_argument("folder", help="scan output folder (e.g. Everything_username)")
    ap.add_argument("--quality", choices=list(QUALITY), default="balanced",
                    help="fast = quickest, best = most accurate but slow (default balanced)")
    ap.add_argument("--model", help="override the CLIP model of the chosen quality level")
    ap.add_argument("--views", type=int, choices=[1, 2, 3, 4], help="override views per image")
    ap.add_argument("--copy", action="store_true", help="copy files instead of hardlinking")
    ap.add_argument("--min-conf", type=float, default=0.25,
                    help="below this confidence an image counts as 'unmatched' (default 0.25)")
    ap.add_argument("--min-cluster", type=int, default=3,
                    help="smallest group that becomes an auto category (default 3)")
    ap.add_argument("--no-discover", action="store_true", help="skip auto-discovering new categories")
    ap.add_argument("--batch", type=int, default=8, help="images per batch (default 8)")
    args = ap.parse_args()

    model_name, views_n = QUALITY[args.quality]
    model_name = args.model or model_name
    views_n = args.views or views_n

    root = Path(args.folder).resolve()
    if not root.is_dir():
        sys.exit("  x  not a folder: %s" % root)

    src_root = root / "files" if (root / "files").is_dir() else root
    out_root = root / "sorted"

    images = find_images(src_root, out_root)
    if not images:
        sys.exit("  x  no images found in %s" % src_root)

    try:
        import torch
        from transformers import CLIPModel, CLIPProcessor
    except ImportError as e:
        sys.exit("  x  missing dependency (%s)\n     pip install torch transformers pillow" % e.name)

    device = pick_device(torch)
    print("  loading %s on %s  (first run downloads the model)..." % (model_name, device), flush=True)
    model = CLIPModel.from_pretrained(model_name).to(device).eval()
    processor = CLIPProcessor.from_pretrained(model_name)
    scale = model.logit_scale.exp().item()

    names = list(CATEGORIES)
    prompts, groups = [], []
    for name in names:
        groups.append((len(prompts), len(prompts) + len(CATEGORIES[name])))
        prompts += CATEGORIES[name]
    medium_names = list(MEDIUMS)

    with torch.inference_mode():
        prompt_embs = embed_texts(torch, model, processor, prompts, device)
        medium_embs = embed_texts(torch, model, processor, list(MEDIUMS.values()), device)

    out_root.mkdir(exist_ok=True)
    cache_file = out_root / (".embeddings_%s.pt" % hashlib.md5(("%s|%d" % (model_name, views_n)).encode()).hexdigest()[:10])
    cache = {}
    if cache_file.exists():
        try:
            cache = torch.load(cache_file, weights_only=True)
        except Exception:
            cache = {}

    def sig(p):
        st = p.stat()
        return "%s|%d|%d" % (p.relative_to(root), st.st_size, int(st.st_mtime))

    embeds = {}
    unreadable = 0
    todo = []
    for p in images:
        hit = cache.get(sig(p))
        if hit is not None:
            embeds[p] = hit.float()
        else:
            todo.append(p)

    print("  embedding %d images  (%d cached)  ·  %d view(s) each\n" % (len(todo), len(images) - len(todo), views_n), flush=True)
    started = time.time()
    interrupted = False
    try:
        with ThreadPoolExecutor(max_workers=4) as pool, torch.inference_mode():
            for i in range(0, len(todo), args.batch):
                batch = todo[i:i + args.batch]
                loaded = list(pool.map(load_views, [(p, views_n) for p in batch]))
                ok = [(p, v) for p, v in zip(batch, loaded) if v]
                unreadable += len(batch) - len(ok)
                if ok:
                    flat = [v for _, vs in ok for v in vs]
                    inputs = processor(images=flat, return_tensors="pt").to(device)
                    feats = as_tensor(model.get_image_features(**inputs))
                    feats = (feats / feats.norm(dim=-1, keepdim=True)).cpu()
                    pos = 0
                    for p, vs in ok:
                        e = feats[pos:pos + len(vs)].mean(dim=0)
                        pos += len(vs)
                        e = e / e.norm()
                        embeds[p] = e
                        cache[sig(p)] = e.half()
                done = min(i + args.batch, len(todo))
                rate = done / max(time.time() - started, 1e-6)
                eta = (len(todo) - done) / rate if rate else 0
                print("\r  %d / %d   %.1f img/s   eta %dm%02ds   " % (done, len(todo), rate, eta // 60, eta % 60), end="", flush=True)
    except KeyboardInterrupt:
        interrupted = True
        print("\n  interrupted — sorting what was embedded so far")
    print()
    try:
        torch.save(cache, cache_file)
    except Exception:
        pass

    paths = [p for p in images if p in embeds]
    if not paths:
        sys.exit("  x  nothing could be read")
    E = torch.stack([embeds[p] for p in paths]).to(device)
    with torch.inference_mode():
        probs = class_scores(torch, E, prompt_embs, groups, scale).softmax(dim=1).cpu()
        med = (scale * E @ medium_embs.T).softmax(dim=1).cpu()
    E = E.cpu()

    assigned = []
    for row, mrow in zip(probs, med):
        conf, idx = row.max(dim=0)
        order = row.argsort(descending=True)[:3].tolist()
        assigned.append([
            names[idx.item()] if conf.item() >= args.min_conf else "uncategorized",
            conf.item(),
            [[names[j], round(row[j].item(), 4)] for j in order],
            medium_names[int(mrow.argmax())],
        ])

    discovered = {}
    left = [i for i, a in enumerate(assigned) if a[0] == "uncategorized"]
    if left and not args.no_discover:
        print("  %d image(s) didn't fit a category — looking for new ones..." % len(left), flush=True)
        with torch.inference_mode():
            found = discover_categories(torch, model, processor, device, E[left], scale, args.min_cluster)
        for name, top3, rows in found:
            discovered[name] = {"looks_like": top3, "count": len(rows)}
            for r in rows:
                assigned[left[r]][0] = name

    for d in out_root.iterdir():
        if d.is_dir():
            shutil.rmtree(d, ignore_errors=True)

    counts = {}
    results = []
    for p, (cat, conf, top, medium) in zip(paths, assigned):
        counts[cat] = counts.get(cat, 0) + 1
        dest = out_root / cat / p.name
        n = 1
        while dest.exists():
            n += 1
            dest = out_root / cat / ("%s_%d%s" % (p.stem, n, p.suffix))
        place(p, dest, args.copy)
        results.append({
            "file": str(p.relative_to(root)),
            "category": cat,
            "confidence": round(conf, 4),
            "medium": medium,
            "top": top,
        })

    with open(out_root / "index.json", "w", encoding="utf-8") as f:
        json.dump({
            "model": model_name,
            "views": views_n,
            "mode": "copy" if args.copy else "hardlink",
            "min_confidence": args.min_conf,
            "counts": counts,
            "auto_categories": discovered,
            "unreadable": unreadable,
            "complete": not interrupted,
            "files": results,
        }, f, indent=2)

    print("\n  results")
    for cat in sorted(counts, key=counts.get, reverse=True):
        extra = ""
        if cat in discovered:
            extra = "   (auto: " + " / ".join(discovered[cat]["looks_like"]) + ")"
        print("    %-24s %d%s" % (cat, counts[cat], extra))
    if unreadable:
        print("    %-24s %d" % ("(unreadable)", unreadable))
    print("\n  Folder  ->  %s" % out_root)


if __name__ == "__main__":
    main()
