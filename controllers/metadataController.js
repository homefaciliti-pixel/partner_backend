const db = require('../db');
const fs = require('fs');
const path = require('path');

// GET /api/metadata/locations
exports.getMetadataLocations = async (req, res) => {
  try {
    const [states] = await db.query('SELECT * FROM states WHERE status = 1');
    const [cities] = await db.query('SELECT * FROM cities WHERE status = 1');
    const [localities] = await db.query('SELECT * FROM localities WHERE status = 1');

    const data = {};
    states.forEach(s => {
      data[s.name] = {};
    });

    cities.forEach(c => {
      const stateName = Object.keys(data).find(s => s.toLowerCase() === c.stateName.toLowerCase());
      if (stateName) {
        data[stateName][c.cityName] = [];
      } else {
        data[c.stateName] = data[c.stateName] || {};
        data[c.stateName][c.cityName] = [];
      }
    });

    localities.forEach(l => {
      const stateName = Object.keys(data).find(s => s.toLowerCase() === l.stateName.toLowerCase()) || l.stateName;
      if (!data[stateName]) {
        data[stateName] = {};
      }
      if (!data[stateName][l.cityName]) {
        data[stateName][l.cityName] = [];
      }
      data[stateName][l.cityName].push(l.localityName);
    });

    res.json(data);
  } catch (error) {
    console.error('Error fetching metadata locations:', error);
    res.status(500).json({ error: 'Failed to fetch location metadata: ' + error.message });
  }
};

// GET /api/metadata/categories
exports.getMetadataCategories = async (req, res) => {
  try {
    const [categories] = await db.query('SELECT * FROM categories WHERE status = 1');
    const [services] = await db.query('SELECT * FROM services WHERE status = 1');

    const mainCategories = categories.filter(c => !c.parent || c.parent === 'None' || c.parent === '' || c.parent === 'Main Category');
    const mainCategoryTitles = mainCategories.map(c => c.title);
    const subCategories = categories.filter(c => c.parent && c.parent !== 'None' && c.parent !== '' && c.parent !== 'Main Category');

    const categoryData = {};
    mainCategoryTitles.forEach(title => {
      categoryData[title] = {};
    });

    subCategories.forEach(sub => {
      const parentTitle = Object.keys(categoryData).find(p => p.toLowerCase() === sub.parent.toLowerCase());
      if (parentTitle) {
        categoryData[parentTitle][sub.title] = [];
      } else {
        categoryData[sub.parent] = categoryData[sub.parent] || {};
        categoryData[sub.parent][sub.title] = [];
      }
    });

    services.forEach(srv => {
      const cat = categories.find(c => c.id === srv.category_id);
      if (!cat) return;

      if (!cat.parent || cat.parent === 'None' || cat.parent === '' || cat.parent === 'Main Category') {
        const mainTitle = Object.keys(categoryData).find(p => p.toLowerCase() === cat.title.toLowerCase()) || cat.title;
        if (!categoryData[mainTitle]) {
          categoryData[mainTitle] = {};
        }
        categoryData[mainTitle]['General'] = categoryData[mainTitle]['General'] || [];
        categoryData[mainTitle]['General'].push(srv.title);
      } else {
        const parentTitle = Object.keys(categoryData).find(p => p.toLowerCase() === cat.parent.toLowerCase()) || cat.parent;
        const subTitle = cat.title;
        
        if (!categoryData[parentTitle]) {
          categoryData[parentTitle] = {};
        }
        if (!categoryData[parentTitle][subTitle]) {
          categoryData[parentTitle][subTitle] = [];
        }
        categoryData[parentTitle][subTitle].push(srv.title);
      }
    });

    res.json({
      categories: mainCategoryTitles,
      categoryData: categoryData
    });
  } catch (error) {
    console.error('Error fetching metadata categories:', error);
    res.status(500).json({ error: 'Failed to fetch category metadata: ' + error.message });
  }
};

// GET /api/locations/states
exports.getStates = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT DISTINCT name FROM states WHERE status = 1 ORDER BY name ASC');
    const states = rows.map(r => r.name);
    res.json(states);
  } catch (error) {
    console.error('Error fetching states:', error);
    res.status(500).json([]);
  }
};

// GET /api/locations/cities
exports.getCities = async (req, res) => {
  const { state } = req.query;
  if (!state) {
    return res.status(400).json({ error: 'state query parameter is required' });
  }
  try {
    const [rows] = await db.query('SELECT DISTINCT cityName FROM cities WHERE stateName = ? AND status = 1 ORDER BY cityName ASC', [state]);
    const cities = rows.map(r => r.cityName);
    res.json(cities);
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json([]);
  }
};

// GET /api/locations/localities
exports.getLocalities = async (req, res) => {
  const { city } = req.query;
  if (!city) {
    return res.status(400).json({ error: 'city query parameter is required' });
  }
  try {
    const [rows] = await db.query('SELECT DISTINCT localityName FROM localities WHERE cityName = ? AND status = 1 ORDER BY localityName ASC', [city]);
    const localities = rows.map(r => r.localityName);
    res.json(localities);
  } catch (error) {
    console.error('Error fetching localities:', error);
    res.status(500).json([]);
  }
};

// GET /api/services/categories
exports.getCategories = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT DISTINCT title FROM categories WHERE (parent = 'None' OR parent IS NULL) AND status = 1 ORDER BY title ASC");
    const categories = rows.map(r => r.title);
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json([]);
  }
};

// GET /api/services/subcategories
exports.getSubcategories = async (req, res) => {
  const { category } = req.query;
  if (!category) {
    return res.status(400).json({ error: 'category query parameter is required' });
  }
  try {
    const [rows] = await db.query("SELECT DISTINCT title FROM categories WHERE parent = ? AND status = 1 ORDER BY title ASC", [category]);
    const subCategories = rows.map(r => r.title);
    res.json(subCategories);
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    res.status(500).json([]);
  }
};

// GET /api/services/list-by-category
exports.getServicesList = async (req, res) => {
  const { category } = req.query;
  if (!category) {
    return res.status(400).json({ error: 'category query parameter is required' });
  }
  try {
    const [rows] = await db.query(
      `SELECT s.title FROM services s 
       JOIN categories c ON s.category_id = c.id 
       WHERE c.title = ? AND s.status = 1 ORDER BY s.title ASC`,
      [category]
    );
    const servicesList = rows.map(r => r.title);
    res.json(servicesList);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json([]);
  }
};

// GET /api/countries
exports.getCountries = (req, res) => {
  try {
    const countriesFile = path.join(__dirname, '../defaults/countries.json');
    if (fs.existsSync(countriesFile)) {
      const data = JSON.parse(fs.readFileSync(countriesFile, 'utf8'));
      return res.json({ success: true, countries: data });
    }
  } catch (e) {}

  res.json({
    success: true,
    countries: [
      { name: "India", code: "+91", flag: "🇮🇳", isoCode: "IN", flagUrl: "https://flagcdn.com/w80/in.png", minLength: 10, maxLength: 10 }
    ]
  });
};

// GET /api/settings/version
exports.getAppVersion = async (req, res) => {
  try {
    const defaults = {
      'android_latest_version': '1.0.8',
      'android_min_supported_version': '1.0.2',
      'android_force_update': 'true',
      'ios_latest_version': '1.0.6',
      'ios_min_supported_version': '1.0.3',
      'ios_force_update': 'true'
    };

    const [rows] = await db.query(
      'SELECT `key`, `value` FROM settings_config WHERE `key` IN (?, ?, ?, ?, ?, ?)',
      Object.keys(defaults)
    );

    const settingsMap = {};
    rows.forEach(r => { settingsMap[r.key] = r.value; });

    const missingKeys = Object.keys(defaults).filter(key => !(key in settingsMap));
    for (const key of missingKeys) {
      try {
        await db.query('INSERT INTO settings_config (`key`, `value`) VALUES (?, ?)', [key, defaults[key]]);
        settingsMap[key] = defaults[key];
      } catch (insertErr) {
        settingsMap[key] = defaults[key];
      }
    }

    res.json({
      success: true,
      android: {
        latestVersion: settingsMap['android_latest_version'] || defaults['android_latest_version'],
        minSupportedVersion: settingsMap['android_min_supported_version'] || defaults['android_min_supported_version'],
        forceUpdate: settingsMap['android_force_update'] === 'true' || settingsMap['android_force_update'] === '1'
      },
      ios: {
        latestVersion: settingsMap['ios_latest_version'] || defaults['ios_latest_version'],
        minSupportedVersion: settingsMap['ios_min_supported_version'] || defaults['ios_min_supported_version'],
        forceUpdate: settingsMap['ios_force_update'] === 'true' || settingsMap['ios_force_update'] === '1'
      }
    });
  } catch (error) {
    console.error('Error fetching version settings:', error);
    res.status(500).json({ error: 'Failed to retrieve version settings: ' + error.message });
  }
};
