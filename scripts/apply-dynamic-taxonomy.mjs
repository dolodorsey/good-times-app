import fs from "node:fs";

const path = new URL("../src/App.jsx", import.meta.url);
let source = fs.readFileSync(path, "utf8");
const original = source;

const replaceOnce = (needle, replacement, label) => {
  const index = source.indexOf(needle);
  if (index < 0) {
    if (source.includes(replacement)) return;
    throw new Error(`Could not find ${label}`);
  }
  source = source.slice(0, index) + replacement + source.slice(index + needle.length);
};

if (!source.includes('from "./taxonomy.js"')) {
  replaceOnce(
    'import { GT_SUPABASE_URL as GT_SB, GT_SUPABASE_ANON_KEY as GT_SK, khgF } from "./lib/supabase.js";\n',
    'import { GT_SUPABASE_URL as GT_SB, GT_SUPABASE_ANON_KEY as GT_SK, khgF } from "./lib/supabase.js";\nimport { loadExploreTaxonomy } from "./taxonomy.js";\n',
    "Supabase import",
  );
}

if (!source.includes("const[exploreCategories,setExploreCategories]")) {
  replaceOnce(
    '  const[venueResults,setVenueResults]=useState([]);\n',
    '  const[venueResults,setVenueResults]=useState([]);\n  const[exploreCategories,setExploreCategories]=useState(Vu);\n',
    "venue results state",
  );
}

if (!source.includes("loadExploreTaxonomy(khgF)")) {
  replaceOnce(
    '  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(null),2000)};\n\n',
    `  const showToast=msg=>{setToast(msg);setTimeout(()=>setToast(null),2000)};\n\n  // Load the canonical Good Times taxonomy from Supabase. The legacy list remains an offline fallback.\n  useEffect(()=>{\n    let mounted=true;\n    loadExploreTaxonomy(khgF)\n      .then(categories=>{if(mounted&&categories.length)setExploreCategories(categories)})\n      .catch(()=>{});\n    return()=>{mounted=false};\n  },[]);\n\n`,
    "showToast insertion point",
  );
}

source = source.replaceAll("{Vu.length} categories to explore", "{exploreCategories.length} categories to explore");
source = source.replaceAll("{Vu.map(cat=>(", "{exploreCategories.map(cat=>(");
source = source.replaceAll(
  'setExploreSheet&&setExploreSheet(Vu.find(c=>c.id==="nightlife"));navigate("explore")',
  'setExploreSheet&&setExploreSheet(exploreCategories.find(c=>c.taxonomyKey==="nightlife"||c.id==="nightlife")||Vu.find(c=>c.id==="nightlife"));navigate("explore")',
);

if (!source.includes("v_gt_venue_taxonomy_directory?select=${sel}")) {
  const startMarker = '                    const subMap={"Nightclubs":"nightclub"';
  const endMarker = '                    setVenueResults(results);setVenueLoading(false);';
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error("Could not find Explore drilldown query block");

  const replacement = `                    const subKey=sub;\n                    const taxonomyCategory=exploreSheet.taxonomyKey||exploreSheet.id;\n                    const sel="id,name,neighborhood,side_of_town,short_desc,hero_image,google_rating,google_reviews,quality_score,price_range,vibe_tags,subcategory,category_key,tab_tags,search_tags,culture_tier,is_khg,is_culture_pick,is_black_owned,culture_tags,instagram_handle,sourced_from,website,phone,booking_link";\n                    // PRIMARY: canonical taxonomy eligibility view. One venue may correctly serve multiple subcategories.\n                    let q=\`v_gt_venue_taxonomy_directory?select=\${sel}&city_key=eq.\${ck}&category_key=eq.\${encodeURIComponent(taxonomyCategory)}&subcategory=eq.\${encodeURIComponent(subKey)}&order=taxonomy_confidence.desc,quality_score.desc.nullslast,google_rating.desc.nullslast&limit=30\`;\n                    let results=await khgF(q);\n                    // FALLBACK: show the strongest venues in the selected taxonomy category.\n                    if(results.length===0){\n                      q=\`v_gt_venue_taxonomy_directory?select=\${sel}&city_key=eq.\${ck}&category_key=eq.\${encodeURIComponent(taxonomyCategory)}&order=taxonomy_confidence.desc,quality_score.desc.nullslast,google_rating.desc.nullslast&limit=30\`;\n                      results=await khgF(q);\n                    }\n`;

  source = source.slice(0, start) + replacement + source.slice(end);
}

if (source === original) {
  console.log("Good Times taxonomy upgrade already applied.");
} else {
  fs.writeFileSync(path, source);
  console.log("Good Times taxonomy upgrade applied.");
}
