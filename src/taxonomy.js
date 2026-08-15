const CATEGORY_META = {
  nightlife: { icon: "🌙", color: "#D4A853" },
  concerts_live_music: { icon: "🎵", color: "#FF6B6B" },
  festivals_major_activations: { icon: "🎪", color: "#FF8A65" },
  comedy_performing_arts: { icon: "🎭", color: "#C8A96E" },
  arts_museums_culture: { icon: "🎨", color: "#C8A96E" },
  dining_culinary: { icon: "🍽️", color: "#FFB86B" },
  sports_watch: { icon: "🏟️", color: "#6BFFB8" },
  day_parties_brunch: { icon: "☀️", color: "#FFD166" },
  family_kids: { icon: "👨‍👩‍👧", color: "#BFA97A" },
  community_civic: { icon: "🤝", color: "#74C0FC" },
  fashion_beauty_shopping: { icon: "🛍️", color: "#FFD700" },
  wellness_fitness: { icon: "🧘", color: "#90EE90" },
  college_alumni: { icon: "🎓", color: "#9B8AFB" },
  faith_inspirational: { icon: "✨", color: "#E6C56B" },
  dating_social: { icon: "💫", color: "#FF69B4" },
  free_things_to_do: { icon: "🆓", color: "#63E6BE" },
  vip_exclusive: { icon: "✦", color: "#D4A853" },
  attractions_experiences: { icon: "🎡", color: "#00CED1" },
  business_professional: { icon: "💼", color: "#7CB9E8" },
  classes_workshops: { icon: "🧠", color: "#A7C957" },
  creative_creator: { icon: "🎬", color: "#DA77F2" },
  games_interactive: { icon: "🎮", color: "#66D9E8" },
  travel_staycations: { icon: "🧳", color: "#74C0FC" },
  black_culture_diaspora: { icon: "🌍", color: "#E9C46A" },
  seasonal_holiday: { icon: "🎉", color: "#FF8787" },
};

const titleFallback = (value = "") =>
  String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export async function loadExploreTaxonomy(khgF) {
  if (typeof khgF !== "function") return [];

  const [categories, subcategories] = await Promise.all([
    khgF(
      "gt_taxonomy_categories?select=category_key,category_name,description,sort_order&is_active=eq.true&order=sort_order.asc,category_name.asc",
    ),
    khgF(
      "gt_taxonomy_subcategories?select=category_key,subcategory_key,subcategory_name,description,sort_order,minimum_upcoming_inventory&is_active=eq.true&order=category_key.asc,sort_order.asc,subcategory_name.asc",
    ),
  ]);

  if (!Array.isArray(categories) || !categories.length) return [];

  // khgF resolves to [] for both "no rows" and "request failed", so an empty
  // subcategory response is treated as a transport failure rather than as proof
  // that every category is empty. Without this, one dropped request wiped the
  // whole Explore catalog and the screen reported "0 categories and 0
  // subcategories" as if that were the truth.
  const subcategoriesLoaded = Array.isArray(subcategories) && subcategories.length > 0;

  const grouped = new Map();
  for (const subcategory of Array.isArray(subcategories) ? subcategories : []) {
    if (!grouped.has(subcategory.category_key)) grouped.set(subcategory.category_key, []);
    grouped.get(subcategory.category_key).push(subcategory);
  }

  return categories
    .map((category) => {
      const meta = CATEGORY_META[category.category_key] || { icon: "✦", color: "#D4A853" };
      const rows = grouped.get(category.category_key) || [];
      return {
        id: category.category_key,
        taxonomyKey: category.category_key,
        name: category.category_name || titleFallback(category.category_key),
        description: category.description || "Discover what is happening now.",
        icon: meta.icon,
        color: meta.color,
        subs: rows.map((row) => row.subcategory_name || titleFallback(row.subcategory_key)),
        subcategoryRows: rows,
      };
    })
    .filter((category) => !subcategoriesLoaded || category.subs.length > 0);
}

export { CATEGORY_META };
