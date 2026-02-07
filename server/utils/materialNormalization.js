const normalizeMaterialInput = (name, unit) => {
    if (!name) return null;

    // 1. Basic normalization
    let cleanName = name.toLowerCase().trim().replaceAll(/\s+/g, ' ');
    let cleanUnit = unit ? unit.toLowerCase().trim().replaceAll(/\s+/g, ' ') : 'pz';

    // 2. Unit normalization
    const unitMap = {
        'pezzo': 'pz', 'pezzi': 'pz', 'pzi': 'pz', 'pcs': 'pz',
        'sacco': 'sacchi', 'sac': 'sacchi',
        'chilogrammo': 'kg', 'chilogrammi': 'kg', 'kilo': 'kg',
        'litro': 'l', 'litri': 'l', 'lt': 'l',
        'metro': 'm', 'metri': 'm', 'mt': 'm',
        'metro quadro': 'mq', 'metri quadri': 'mq', 'mq': 'mq', 'm2': 'mq',
        'metro cubo': 'mc', 'metri cubi': 'mc', 'mc': 'mc', 'm3': 'mc'
    };

    if (unitMap[cleanUnit]) {
        cleanUnit = unitMap[cleanUnit];
    }

    // 3. Singular/Plural mapping (basic Italian)
    // Very basic heuristic: if ends with 'i' or 'e', try to find singular
    // This is not perfect but helps with "nastri" -> "nastro"
    const singularMap = {
        'nastri': 'nastro',
        'tubi': 'tubo',
        'cavi': 'cavo',
        'viti': 'vite',
        'bulloni': 'bullone',
        'pannelli': 'pannello',
        'lastre': 'lastra',
        'mattoni': 'mattone',
        'tegole': 'tegola',
        'sacchi': 'sacco' // Exception for family name if used
    };

    const words = cleanName.split(' ');
    let family = words[0];

    if (singularMap[family]) {
        family = singularMap[family];
    } else if (family.endsWith('i') && family.length > 4) {
        // Heuristic: try replacing 'i' with 'o' (nastri -> nastro)
        // Only if not in map
        // family = family.slice(0, -1) + 'o'; 
        // Better to stick to explicit map to avoid "bisturi" -> "bisturo"
    }

    // 4. Split Family / Spec
    let spec = words.slice(1).join(' ');

    // Clean punctuation and truncate
    if (spec) {
        spec = spec.replaceAll(/[.,;:]/g, '').trim();
        if (spec.length > 40) {
            spec = spec.substring(0, 40).trim() + '...';
        }
    } else {
        spec = '';
    }

    // 5. Normalized Key
    const normalizedKey = `${family}|${spec}|${cleanUnit}`;

    // 6. Display Name (Capitalized)
    const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const displayName = capitalize(family) + (spec ? ' ' + spec : '');

    return {
        family,
        spec,
        unit: cleanUnit,
        displayName,
        normalizedKey
    };
};

module.exports = { normalizeMaterialInput };
